"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { createCouponSchema } from "@/lib/validation/coupon";

export type CouponFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createCoupon(
  _prevState: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const user = await requireOnboardedCreator();

  const validatedFields = createCouponSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    maxRedemptions: formData.get("maxRedemptions") ?? "",
    expiresAt: formData.get("expiresAt") ?? "",
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { code, discountType, discountValue, maxRedemptions, expiresAt } = validatedFields.data;

  const existing = await db.coupon.findUnique({
    where: { creatorProfileId_code: { creatorProfileId: user.creatorProfile.id, code } },
    select: { id: true },
  });
  if (existing) {
    return { errors: { code: ["You already have a coupon with this code."] } };
  }

  await db.coupon.create({
    data: {
      creatorProfileId: user.creatorProfile.id,
      code,
      discountType,
      discountValue,
      maxRedemptions: maxRedemptions === "" ? null : Number(maxRedemptions),
      expiresAt: expiresAt === "" ? null : new Date(expiresAt),
    },
  });

  revalidatePath("/dashboard/coupons");
  return {};
}

export async function setCouponActive(couponId: string, isActive: boolean) {
  const user = await requireOnboardedCreator();

  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || coupon.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Coupon not found.");
  }

  await db.coupon.update({ where: { id: couponId }, data: { isActive } });
  revalidatePath("/dashboard/coupons");
}

export async function deleteCoupon(couponId: string) {
  const user = await requireOnboardedCreator();

  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || coupon.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Coupon not found.");
  }

  try {
    await db.coupon.delete({ where: { id: couponId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new Error("This coupon has been used on an order and can't be deleted — deactivate it instead.");
    }
    throw error;
  }

  revalidatePath("/dashboard/coupons");
}
