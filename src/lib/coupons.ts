export type CouponDiscount = { discountType: "PERCENT" | "FIXED"; discountValue: number };

export function calculateDiscountMinor(subtotalMinor: number, coupon: CouponDiscount): number {
  const raw =
    coupon.discountType === "PERCENT"
      ? Math.round((subtotalMinor * coupon.discountValue) / 100)
      : coupon.discountValue;

  return Math.min(Math.max(raw, 0), subtotalMinor);
}
