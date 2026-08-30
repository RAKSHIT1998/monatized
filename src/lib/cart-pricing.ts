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

  const productIds = [...new Set(requested.map((line) => line.productId))];

  const products = await db.product.findMany({
    where: {
      id: { in: productIds },
      creatorProfileId: creatorProfile.id,
      status: "PUBLISHED",
      type: { in: [...CART_ELIGIBLE_PRODUCT_TYPES] },
    },
    include: { variants: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  // Two requested lines can share a productId when they're different
  // variants of the same product (1 Red + 1 Blue) — so this resolves each
  // requested line independently rather than mapping products 1:1.
  const items: CartPricingLine[] = [];
  let droppedCount = 0;
  for (const line of requested) {
    const product = productById.get(line.productId);
    if (!product) {
      droppedCount++;
      continue;
    }

    let stockQuantity = product.stockQuantity;
    let variantLabel: string | undefined;
    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) {
        droppedCount++;
        continue;
      }
      stockQuantity = variant.stockQuantity;
      variantLabel = variant.label;
    }

    items.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      type: product.type as CartEligibleProductType,
      coverImageUrl: product.coverImageUrl,
      unitPriceAmountMinor: product.priceAmountMinor,
      quantity: line.quantity,
      lineTotalAmountMinor: product.priceAmountMinor * line.quantity,
      stockQuantity,
      shippingFeeMinor: product.shippingFeeMinor,
      variantId: line.variantId,
      variantLabel,
    });
  }

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
    droppedCount,
  };
}
