import "server-only";
import { db } from "@/lib/db";
import type { Coupon } from "@/generated/prisma/client";

export type CouponLookupResult =
  | { valid: true; coupon: Coupon }
  | { valid: false; message: string };

export async function lookupValidCoupon(
  creatorProfileId: string,
  code: string,
): Promise<CouponLookupResult> {
  const coupon = await db.coupon.findUnique({
    where: { creatorProfileId_code: { creatorProfileId, code } },
  });

  if (!coupon || !coupon.isActive) {
    return { valid: false, message: "This coupon isn't valid." };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { valid: false, message: "This coupon has expired." };
  }
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { valid: false, message: "This coupon has reached its usage limit." };
  }

  return { valid: true, coupon };
}
