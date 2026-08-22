"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { generateOrderNumber, markOrderFailed, markOrderPaid } from "@/lib/orders";
import { calculateDiscountMinor } from "@/lib/coupons";
import { lookupValidCoupon } from "@/lib/coupon-lookup";
import { formatMoney } from "@/lib/money";
import {
  activateSubscription,
  cancelSubscriptionRecord,
  generateSubscriptionAccessToken,
} from "@/lib/subscriptions";
import { startCheckoutSchema } from "@/lib/validation/checkout";
import type { Product } from "@/generated/prisma/client";

export type CheckoutFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function startCheckout(
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const username = String(formData.get("username"));
  const slug = String(formData.get("slug"));

  const validatedFields = startCheckoutSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    couponCode: formData.get("couponCode") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }
  const { email, name, couponCode } = validatedFields.data;

  const product = await db.product.findFirst({
    where: { slug, status: "PUBLISHED", creatorProfile: { username } },
    include: { creatorProfile: { include: { plan: true } } },
  });
  if (!product) {
    return { message: "This product is no longer available." };
  }

  const customer = await db.customer.upsert({
    where: { creatorProfileId_email: { creatorProfileId: product.creatorProfileId, email } },
    create: { creatorProfileId: product.creatorProfileId, email, name },
    update: name ? { name } : {},
  });

  if (product.type === "SUBSCRIPTION") {
    return startSubscriptionCheckout(product, customer.id, email, username, slug);
  }

  let coupon = null;
  if (couponCode) {
    const result = await lookupValidCoupon(product.creatorProfileId, couponCode);
    if (!result.valid) {
      return { errors: { couponCode: [result.message] } };
    }
    coupon = result.coupon;
  }

  const subtotalAmountMinor = product.priceAmountMinor;
  const discountAmountMinor = coupon ? calculateDiscountMinor(subtotalAmountMinor, coupon) : 0;
  const totalAmountMinor = subtotalAmountMinor - discountAmountMinor;
  const platformFeeAmountMinor = Math.round(
    (totalAmountMinor * product.creatorProfile.plan.platformFeeBps) / 10_000,
  );
  const orderNumber = generateOrderNumber();

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        creatorProfileId: product.creatorProfileId,
        customerId: customer.id,
        couponId: coupon?.id,
        currency: product.currency,
        subtotalAmountMinor,
        discountAmountMinor,
        totalAmountMinor,
        platformFeeAmountMinor,
        items: {
          create: {
            productId: product.id,
            titleSnapshot: product.title,
            priceAmountMinorSnapshot: product.priceAmountMinor,
          },
        },
        payment: {
          create: {
            provider: getPaymentProvider().name,
            amountMinor: totalAmountMinor,
            currency: product.currency,
          },
        },
      },
    });

    await tx.analyticsEvent.create({
      data: {
        creatorProfileId: product.creatorProfileId,
        type: "CHECKOUT_STARTED",
        productId: product.id,
        orderId: created.id,
      },
    });

    return created;
  });

  // A coupon can cover the full price — nothing to charge, so skip the payment
  // provider entirely rather than sending a $0 request it may reject.
  if (totalAmountMinor === 0) {
    await markOrderPaid(order.id, "zero_amount_coupon");
    redirect(`/order/${order.orderNumber}`);
  }

  const appUrl = getAppUrl();
  const checkout = await getPaymentProvider().createCheckout({
    orderId: order.id,
    orderNumber: order.orderNumber,
    productTitle: product.title,
    amountMinor: totalAmountMinor,
    currency: product.currency,
    customerEmail: email,
    successUrl: `${appUrl}/order/${order.orderNumber}`,
    cancelUrl: `${appUrl}/${username}/${slug}`,
  });

  await db.payment.update({
    where: { orderId: order.id },
    data: { providerOrderId: checkout.providerOrderId },
  });

  redirect(checkout.checkoutUrl);
}

async function startSubscriptionCheckout(
  product: Product,
  customerId: string,
  email: string,
  username: string,
  slug: string,
): Promise<CheckoutFormState> {
  const provider = getPaymentProvider();
  if (!provider.createSubscriptionCheckout) {
    return {
      message: `Recurring subscriptions aren't supported with the ${provider.name.toLowerCase()} payment provider yet.`,
    };
  }
  if (!product.billingInterval) {
    return { message: "This subscription isn't configured correctly." };
  }

  const subscription = await db.subscription.create({
    data: {
      creatorProfileId: product.creatorProfileId,
      productId: product.id,
      customerId,
      provider: provider.name,
      accessToken: generateSubscriptionAccessToken(),
      unitAmountMinor: product.priceAmountMinor,
      currency: product.currency,
      billingInterval: product.billingInterval,
    },
  });

  const appUrl = getAppUrl();

  // `redirect()` throws Next.js's own control-flow signal — it must stay outside
  // this try/catch, or catching-and-cancelling here would cancel a subscription
  // whose checkout was actually created successfully.
  let checkoutUrl: string;
  try {
    const result = await provider.createSubscriptionCheckout({
      subscriptionId: subscription.id,
      productTitle: product.title,
      amountMinor: product.priceAmountMinor,
      currency: product.currency,
      billingInterval: product.billingInterval,
      customerEmail: email,
      successUrl: `${appUrl}/member/${subscription.accessToken}`,
      cancelUrl: `${appUrl}/${username}/${slug}`,
    });
    await db.subscription.update({
      where: { id: subscription.id },
      data: { providerSubscriptionId: result.providerSubscriptionId },
    });
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    await cancelSubscriptionRecord(subscription.id);
    throw error;
  }

  redirect(checkoutUrl);
}

// Only ever completes orders created with the MOCK provider — this can never be used
// to fake-confirm a real Stripe/Razorpay order, which are only marked PAID by their
// signature-verified webhook handlers.
export async function completeMockPayment(orderId: string, outcome: "success" | "failure") {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order || order.payment?.provider !== "MOCK") {
    throw new Error("This order can't be completed here.");
  }

  if (outcome === "success") {
    await markOrderPaid(order.id, `mock_payment_${order.id}`);
  } else {
    await markOrderFailed(order.id);
  }

  redirect(`/order/${order.orderNumber}`);
}

// Only ever completes subscriptions created with the MOCK provider — same rationale
// as completeMockPayment above.
export async function completeMockSubscription(subscriptionId: string, outcome: "success" | "failure") {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { creatorProfile: { select: { username: true } } },
  });
  if (!subscription || subscription.provider !== "MOCK") {
    throw new Error("This subscription can't be completed here.");
  }

  if (outcome === "success") {
    await activateSubscription(subscription.id, `mock_sub_${subscription.id}`);
    redirect(`/member/${subscription.accessToken}`);
  } else {
    await cancelSubscriptionRecord(subscription.id);
    redirect(`/${subscription.creatorProfile.username}`);
  }
}

export type CouponPreviewResult =
  | { valid: true; discountLabel: string; totalLabel: string }
  | { valid: false; message: string };

// UX-only preview so the buyer sees the discount before paying — startCheckout
// re-validates and recomputes the discount itself, so this can never be trusted
// to actually authorize a price.
export async function previewCoupon(
  username: string,
  slug: string,
  rawCode: string,
): Promise<CouponPreviewResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, message: "Enter a coupon code." };

  const product = await db.product.findFirst({
    where: { slug, status: "PUBLISHED", creatorProfile: { username } },
  });
  if (!product) return { valid: false, message: "This product is no longer available." };

  const result = await lookupValidCoupon(product.creatorProfileId, code);
  if (!result.valid) return { valid: false, message: result.message };

  const discountAmountMinor = calculateDiscountMinor(product.priceAmountMinor, result.coupon);
  const totalAmountMinor = product.priceAmountMinor - discountAmountMinor;

  return {
    valid: true,
    discountLabel: formatMoney(discountAmountMinor, product.currency),
    totalLabel: formatMoney(totalAmountMinor, product.currency),
  };
}
