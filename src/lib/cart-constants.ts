// Product types a cart can hold. BOOKING (needs a specific slot),
// SUBSCRIPTION (recurring billing, different completion path), and TIP
// (buyer-chosen amount + message) keep their existing single-item "Buy
// now"/"Subscribe"/"Book a time"/"Give a tip" flow instead — they never go
// through the cart. Shared between client (deciding whether to show "Add to
// cart") and server (defensively filtering what a cart checkout will accept).
export const CART_ELIGIBLE_PRODUCT_TYPES = ["DIGITAL", "COURSE", "PHYSICAL"] as const;

export type CartEligibleProductType = (typeof CART_ELIGIBLE_PRODUCT_TYPES)[number];

export function isCartEligibleType(type: string): type is CartEligibleProductType {
  return (CART_ELIGIBLE_PRODUCT_TYPES as readonly string[]).includes(type);
}

export const MAX_CART_LINE_QUANTITY = 20;
export const MAX_CART_LINES = 20;
