import "server-only";
import { db } from "@/lib/db";
import { CART_ELIGIBLE_PRODUCT_TYPES, type CartEligibleProductType } from "@/lib/cart-constants";
import type { CartLineInput } from "@/lib/validation/cart";
import { EMPTY_CART_PRICING, type CartPricing, type CartPricingLine } from "@/lib/cart-pricing-types";

export type { CartPricing, CartPricingLine };

// Re-fetches every product fresh from the DB — never trusts a client-supplied
// price, title, or stock figure. The query itself drops anything unpublished,
// deleted, belonging to a different creator, or not a cart-eligible type
// (defense in depth: the UI never lets those into a cart, but this is the
// only place that actually enforces it).
export async function buildCartPricing(
  username: string,
  requested: CartLineInput[],
): Promise<CartPricing> {
  const creatorProfile = await db.creatorProfile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!creatorProfile) return { ...EMPTY_CART_PRICING };

  const quantityByProductId = new Map(requested.map((line) => [line.productId, line.quantity]));

  const products = await db.product.findMany({
    where: {
      id: { in: [...quantityByProductId.keys()] },
      creatorProfileId: creatorProfile.id,
      status: "PUBLISHED",
      type: { in: [...CART_ELIGIBLE_PRODUCT_TYPES] },
    },
    // `id: {in: [...]}` doesn't preserve the input array's order — sort
    // explicitly so "first item" (used for the combined checkout title) is
    // stable rather than whatever order the DB happens to return.
    orderBy: { createdAt: "asc" },
  });

  const items: CartPricingLine[] = products.map((product) => {
    const quantity = quantityByProductId.get(product.id)!;
    return {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      type: product.type as CartEligibleProductType,
      coverImageUrl: product.coverImageUrl,
      unitPriceAmountMinor: product.priceAmountMinor,
      quantity,
      lineTotalAmountMinor: product.priceAmountMinor * quantity,
      stockQuantity: product.stockQuantity,
      shippingFeeMinor: product.shippingFeeMinor,
    };
  });

  const subtotalAmountMinor = items.reduce((sum, item) => sum + item.lineTotalAmountMinor, 0);
  // Once per distinct physical line, never multiplied by that line's quantity
  // — same rule as a single-item PHYSICAL checkout (see Product.shippingFeeMinor).
  const shippingFeeAmountMinor = items
    .filter((item) => item.type === "PHYSICAL")
    .reduce((sum, item) => sum + (item.shippingFeeMinor ?? 0), 0);

  return {
    creatorProfileId: creatorProfile.id,
    currency: products[0]?.currency ?? "INR",
    items,
    subtotalAmountMinor,
    shippingFeeAmountMinor,
    needsShippingAddress: items.some((item) => item.type === "PHYSICAL"),
    droppedCount: quantityByProductId.size - items.length,
  };
}
