"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import * as z from "zod";
import { db } from "@/lib/db";
import { findActiveAffiliateByCode } from "@/lib/affiliates";
import { REF_COOKIE_NAME } from "@/lib/affiliate-constants";
import { getPaymentProvider } from "@/lib/payments";
import { generateOrderNumber, markOrderPaid } from "@/lib/orders";
import { calculateDiscountMinor } from "@/lib/coupons";
import { lookupValidCoupon } from "@/lib/coupon-lookup";
import { formatMoney } from "@/lib/money";
import { buildCartPricing, type CartPricing } from "@/lib/cart-pricing";
import { cartLineSchema, parseCartItemsJson, type CartLineInput } from "@/lib/validation/cart";
import { MAX_CART_LINES } from "@/lib/cart-constants";
import { startCheckoutSchema, shippingAddressSchema } from "@/lib/validation/checkout";
import { getAppUrl } from "@/lib/app-url";
import { decrementStockGuarded, type StockTarget } from "@/lib/stock";
import type { CheckoutFormState } from "@/app/actions/checkout";

// Thrown from inside the checkout $transaction when a cart line's stock ran
// out between the buyer viewing their cart and submitting payment — same
// pattern as OutOfStockError in checkout.ts, generalized to name which item.
class CartOutOfStockError extends Error {
  constructor(public itemTitle: string) {
    super();
  }
}

// Best-effort sanitizing for read-only display paths (cart summary, coupon
// preview) — drops malformed lines instead of failing the whole request,
// since a stale/corrupted localStorage entry shouldn't break browsing.
// startCartCheckout (the actual money-moving action) uses the strict
// cartItemsSchema instead and rejects outright on anything malformed.
function sanitizeCartItems(rawItems: unknown): CartLineInput[] {
  if (!Array.isArray(rawItems)) return [];
  const result: CartLineInput[] = [];
  for (const raw of rawItems) {
    const parsed = cartLineSchema.safeParse(raw);
    if (parsed.success) result.push(parsed.data);
    if (result.length >= MAX_CART_LINES) break;
  }
  return result;
}

export async function getCartSummary(
  username: string,
  rawItems: unknown,
): Promise<CartPricing> {
  return buildCartPricing(username, sanitizeCartItems(rawItems));
}

export type CartCouponPreviewResult =
  | { valid: true; discountLabel: string; totalLabel: string }
  | { valid: false; message: string };

// UX-only preview, same posture as previewCoupon in checkout.ts —
// startCartCheckout re-validates and recomputes everything itself.
export async function previewCartCoupon(
  username: string,
  rawItems: unknown,
  rawCode: string,
): Promise<CartCouponPreviewResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, message: "Enter a coupon code." };

  const pricing = await buildCartPricing(username, sanitizeCartItems(rawItems));
  if (!pricing.creatorProfileId || pricing.items.length === 0) {
    return { valid: false, message: "Your cart is empty." };
  }

  const result = await lookupValidCoupon(pricing.creatorProfileId, code);
  if (!result.valid) return { valid: false, message: result.message };

  const discountAmountMinor = calculateDiscountMinor(pricing.subtotalAmountMinor, result.coupon);
  const totalAmountMinor =
    pricing.subtotalAmountMinor - discountAmountMinor + pricing.shippingFeeAmountMinor;

  return {
    valid: true,
    discountLabel: formatMoney(discountAmountMinor, pricing.currency),
    totalLabel: formatMoney(totalAmountMinor, pricing.currency),
  };
}

export async function startCartCheckout(
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const username = String(formData.get("username"));

  const validatedFields = startCheckoutSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    couponCode: formData.get("couponCode") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }
  const { email, name, couponCode } = validatedFields.data;

  const cartItems = parseCartItemsJson(String(formData.get("cartItemsJson") ?? ""));
  if (!cartItems) {
    return { message: "Your cart looks invalid — please refresh and try again." };
  }

  const pricing = await buildCartPricing(username, cartItems);
  if (!pricing.creatorProfileId || pricing.items.length === 0) {
    return { message: "Your cart is empty or no longer available." };
  }
  const creatorProfileId = pricing.creatorProfileId;

  let shippingAddress: z.infer<typeof shippingAddressSchema> | null = null;
  if (pricing.needsShippingAddress) {
    const shippingValidation = shippingAddressSchema.safeParse({
      name: formData.get("shippingName"),
      line1: formData.get("shippingLine1"),
      line2: formData.get("shippingLine2"),
      city: formData.get("shippingCity"),
      state: formData.get("shippingState"),
      postalCode: formData.get("shippingPostalCode"),
      country: formData.get("shippingCountry"),
      phone: formData.get("shippingPhone"),
    });
    if (!shippingValidation.success) {
      return { errors: shippingValidation.error.flatten().fieldErrors };
    }
    shippingAddress = shippingValidation.data;
  }

  // Early, friendly check before touching payment — the atomic decrement
  // inside the transaction below is the real guard against a concurrent race.
  for (const item of pricing.items) {
    if (item.type === "PHYSICAL" && item.stockQuantity !== null && item.stockQuantity < item.quantity) {
      return { message: `"${item.title}" doesn't have ${item.quantity} left in stock.` };
    }
  }

  const customer = await db.customer.upsert({
    where: { creatorProfileId_email: { creatorProfileId, email } },
    create: { creatorProfileId, email, name },
    update: name ? { name } : {},
  });

  let coupon = null;
  if (couponCode) {
    const result = await lookupValidCoupon(creatorProfileId, couponCode);
    if (!result.valid) {
      return { errors: { couponCode: [result.message] } };
    }
    coupon = result.coupon;
  }

  // Attribution is best-effort and silent, same as startCheckout.
  const refCode = (await cookies()).get(REF_COOKIE_NAME)?.value;
  const affiliate = refCode ? await findActiveAffiliateByCode(creatorProfileId, refCode) : null;

  const discountAmountMinor = coupon ? calculateDiscountMinor(pricing.subtotalAmountMinor, coupon) : 0;
  const totalAmountMinor =
    pricing.subtotalAmountMinor - discountAmountMinor + pricing.shippingFeeAmountMinor;

  const creatorProfile = await db.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: { plan: { select: { platformFeeBps: true } } },
  });
  if (!creatorProfile) {
    return { message: "This store is no longer available." };
  }
  const platformFeeAmountMinor = Math.round(
    (totalAmountMinor * creatorProfile.plan.platformFeeBps) / 10_000,
  );
  const orderNumber = generateOrderNumber();

  let order;
  try {
    order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          creatorProfileId,
          customerId: customer.id,
          couponId: coupon?.id,
          affiliateId: affiliate?.id,
          currency: pricing.currency,
          subtotalAmountMinor: pricing.subtotalAmountMinor,
          discountAmountMinor,
          shippingFeeAmountMinor: pricing.shippingFeeAmountMinor,
          totalAmountMinor,
          platformFeeAmountMinor,
          shippingAddress: shippingAddress ?? undefined,
          items: {
            create: pricing.items.map((item) => ({
              productId: item.productId,
              titleSnapshot: item.title,
              priceAmountMinorSnapshot: item.unitPriceAmountMinor,
              quantity: item.quantity,
              variantId: item.variantId,
              variantLabel: item.variantLabel,
            })),
          },
          payment: {
            create: {
              provider: getPaymentProvider().name,
              amountMinor: totalAmountMinor,
              currency: pricing.currency,
            },
          },
        },
      });

      // Same guarded-decrement pattern as startCheckout, generalized from
      // decrementing 1 to decrementing this line's quantity, and targeting
      // the variant's own stock when the line has one.
      for (const item of pricing.items) {
        if (item.type === "PHYSICAL" && item.stockQuantity !== null) {
          const target: StockTarget = item.variantId
            ? { kind: "variant", id: item.variantId }
            : { kind: "product", id: item.productId };
          const ok = await decrementStockGuarded(tx, target, item.quantity);
          if (!ok) {
            throw new CartOutOfStockError(item.title);
          }
        }
      }

      // No productId — this order can hold several products, same convention
      // markOrderPaid already uses for ORDER_COMPLETED on multi-item orders.
      await tx.analyticsEvent.create({
        data: { creatorProfileId, type: "CHECKOUT_STARTED", orderId: created.id },
      });

      return created;
    });
  } catch (error) {
    if (error instanceof CartOutOfStockError) {
      return { message: `"${error.itemTitle}" just sold out — remove it from your cart and try again.` };
    }
    throw error;
  }

  if (totalAmountMinor === 0) {
    await markOrderPaid(order.id, "zero_amount_coupon");
    redirect(`/order/${order.orderNumber}`);
  }

  const appUrl = getAppUrl();
  const combinedTitle =
    pricing.items.length > 1
      ? `${pricing.items[0].title} + ${pricing.items.length - 1} more`
      : pricing.items[0].title;

  const checkout = await getPaymentProvider().createCheckout({
    orderId: order.id,
    orderNumber: order.orderNumber,
    productTitle: combinedTitle,
    amountMinor: totalAmountMinor,
    currency: pricing.currency,
    customerEmail: email,
    successUrl: `${appUrl}/order/${order.orderNumber}`,
    cancelUrl: `${appUrl}/${username}/cart`,
  });

  await db.payment.update({
    where: { orderId: order.id },
    data: { providerOrderId: checkout.providerOrderId },
  });

  redirect(checkout.checkoutUrl);
}
