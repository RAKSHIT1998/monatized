import type { CartEligibleProductType } from "@/lib/cart-constants";

// Split out from cart-pricing.ts (which is "server-only" and pulls in the DB
// client) so client components can import the shape/empty-state without
// dragging that server-only module into the browser bundle — same pattern
// established for password-reset-token.ts / rate-limit-core.ts.
export type CartPricingLine = {
  productId: string;
  slug: string;
  title: string;
  type: CartEligibleProductType;
  coverImageUrl: string | null;
  unitPriceAmountMinor: number;
  quantity: number;
  lineTotalAmountMinor: number;
  stockQuantity: number | null;
  shippingFeeMinor: number | null;
};

export type CartPricing = {
  creatorProfileId: string | null;
  currency: string;
  items: CartPricingLine[];
  subtotalAmountMinor: number;
  shippingFeeAmountMinor: number;
  needsShippingAddress: boolean;
  droppedCount: number;
};

export const EMPTY_CART_PRICING: CartPricing = {
  creatorProfileId: null,
  currency: "INR",
  items: [],
  subtotalAmountMinor: 0,
  shippingFeeAmountMinor: 0,
  needsShippingAddress: false,
  droppedCount: 0,
};
