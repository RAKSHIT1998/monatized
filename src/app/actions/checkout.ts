"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import * as z from "zod";
import { db } from "@/lib/db";
import { findActiveAffiliateByCode } from "@/lib/affiliates";
import { REF_COOKIE_NAME } from "@/lib/affiliate-constants";
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
import { generateBookingAccessToken } from "@/lib/bookings";
import { startCheckoutSchema, shippingAddressSchema, tipAmountSchema } from "@/lib/validation/checkout";
import { bookingSlotSelectionSchema } from "@/lib/validation/booking";
import { toMinorUnits } from "@/lib/money";
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

// Thrown from inside the checkout $transaction when a PHYSICAL product's
// limited stock ran out between page load and submit — caught below and
// turned into a friendly message, the same pattern used for a booking slot
// that got taken by someone else in the meantime.
class OutOfStockError extends Error {}

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

  let bookingSlot: { startsAt: Date; endsAt: Date } | null = null;
  if (product.type === "BOOKING") {
    if (!product.bookingDurationMinutes) {
      return { message: "This booking isn't configured correctly." };
    }
    const slotValidation = bookingSlotSelectionSchema.safeParse({
      startsAt: formData.get("startsAt"),
    });
    if (!slotValidation.success) {
      return { message: "Pick a time slot before continuing." };
    }
    const startsAt = new Date(slotValidation.data.startsAt);
    if (startsAt.getTime() < Date.now()) {
      return { message: "That time has already passed — pick another slot." };
    }
    const taken = await db.booking.findUnique({
      where: { productId_startsAt: { productId: product.id, startsAt } },
    });
    if (taken && taken.status === "CONFIRMED") {
      return { message: "That slot was just booked by someone else — pick another." };
    }
    bookingSlot = {
      startsAt,
      endsAt: new Date(startsAt.getTime() + product.bookingDurationMinutes * 60_000),
    };
  }

  let shippingAddress: z.infer<typeof shippingAddressSchema> | null = null;
  if (product.type === "PHYSICAL") {
    if (product.stockQuantity !== null && product.stockQuantity <= 0) {
      return { message: "This item is sold out." };
    }
    const shippingValidation = shippingAddressSchema.safeParse({
      name: formData.get("shippingName"),
      line1: formData.get("shippingLine1"),
      line2: formData.get("shippingLine2"),
      city: formData.get("shippingCity"),
      state: formData.get("shippingState"),
      postalCode: formData.get("shippingPostalCode"),
      country: formData.get("shippingCountry"),
    });
    if (!shippingValidation.success) {
      return { errors: shippingValidation.error.flatten().fieldErrors };
    }
    shippingAddress = shippingValidation.data;
  }

  let buyerNote: string | undefined;
  let tipAmountMinor: number | null = null;
  if (product.type === "TIP") {
    const tipValidation = tipAmountSchema.safeParse(formData.get("tipAmount"));
    if (!tipValidation.success) {
      return { errors: { tipAmount: tipValidation.error.flatten().formErrors } };
    }
    tipAmountMinor = toMinorUnits(tipValidation.data);
    const note = formData.get("buyerNote");
    if (typeof note === "string" && note.trim()) {
      buyerNote = note.trim().slice(0, 500);
    }
  }

  let coupon = null;
  if (couponCode) {
    const result = await lookupValidCoupon(product.creatorProfileId, couponCode);
    if (!result.valid) {
      return { errors: { couponCode: [result.message] } };
    }
    coupon = result.coupon;
  }

  // Attribution is best-effort and silent — an expired/invalid ref cookie
  // should never block a purchase, it just means no affiliate gets credited.
  const refCode = (await cookies()).get(REF_COOKIE_NAME)?.value;
  const affiliate = refCode ? await findActiveAffiliateByCode(product.creatorProfileId, refCode) : null;

  const subtotalAmountMinor = tipAmountMinor ?? product.priceAmountMinor;
  const discountAmountMinor = coupon ? calculateDiscountMinor(subtotalAmountMinor, coupon) : 0;
  const totalAmountMinor = subtotalAmountMinor - discountAmountMinor;
  const platformFeeAmountMinor = Math.round(
    (totalAmountMinor * product.creatorProfile.plan.platformFeeBps) / 10_000,
  );
  const orderNumber = generateOrderNumber();

  let order;
  try {
    order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          creatorProfileId: product.creatorProfileId,
          customerId: customer.id,
          couponId: coupon?.id,
          affiliateId: affiliate?.id,
          currency: product.currency,
          subtotalAmountMinor,
          discountAmountMinor,
          totalAmountMinor,
          platformFeeAmountMinor,
          shippingAddress: shippingAddress ?? undefined,
          buyerNote,
          items: {
            create: {
              productId: product.id,
              titleSnapshot: product.title,
              priceAmountMinorSnapshot: tipAmountMinor ?? product.priceAmountMinor,
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

      // Reserved right away (before payment even starts) so the DB's unique
      // constraint on (productId, startsAt) is the single source of truth for
      // "who won this slot" — a failed/abandoned checkout later frees it again
      // via markOrderFailed's booking cleanup.
      if (bookingSlot) {
        await tx.booking.create({
          data: {
            orderId: created.id,
            productId: product.id,
            customerId: customer.id,
            startsAt: bookingSlot.startsAt,
            endsAt: bookingSlot.endsAt,
            accessToken: generateBookingAccessToken(),
          },
        });
      }

      // Same pattern as the booking slot reservation above: decrement stock
      // right away, guarded by the `gt: 0` condition so two concurrent buyers
      // can never both win the last unit. A failed/abandoned checkout later
      // restores it via markOrderFailed.
      if (product.type === "PHYSICAL" && product.stockQuantity !== null) {
        const stockResult = await tx.product.updateMany({
          where: { id: product.id, stockQuantity: { gt: 0 } },
          data: { stockQuantity: { decrement: 1 } },
        });
        if (stockResult.count === 0) {
          throw new OutOfStockError();
        }
      }

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
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return { message: "This item just sold out." };
    }
    if (
      bookingSlot &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { message: "That slot was just booked by someone else — pick another." };
    }
    throw error;
  }

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
