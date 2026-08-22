"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { cancelBookingAsCreator, cancelBookingAsMember as cancelAsMember } from "@/lib/bookings";
import { availabilityRuleSchema } from "@/lib/validation/booking";

async function getOwnedProduct(productId: string, creatorProfileId: string) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.creatorProfileId !== creatorProfileId || product.type !== "BOOKING") {
    return null;
  }
  return product;
}

export async function addAvailabilityRule(productId: string, formData: FormData) {
  const user = await requireOnboardedCreator();
  const product = await getOwnedProduct(productId, user.creatorProfile.id);
  if (!product) throw new Error("Booking product not found.");

  const validated = availabilityRuleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startMinute: formData.get("startMinute"),
    endMinute: formData.get("endMinute"),
  });
  if (!validated.success) {
    throw new Error(validated.error.issues[0]?.message ?? "Invalid availability window.");
  }

  await db.availabilityRule.create({ data: { productId, ...validated.data } });
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function removeAvailabilityRule(ruleId: string) {
  const user = await requireOnboardedCreator();
  const rule = await db.availabilityRule.findUnique({ where: { id: ruleId }, include: { product: true } });
  if (!rule || rule.product.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Availability window not found.");
  }

  await db.availabilityRule.delete({ where: { id: ruleId } });
  revalidatePath(`/dashboard/products/${rule.productId}`);
}

export async function cancelBookingAsMember(accessToken: string) {
  const booking = await db.booking.findUnique({ where: { accessToken } });
  if (!booking) throw new Error("Booking not found.");

  await cancelAsMember(accessToken);
  revalidatePath(`/booking/${accessToken}`);
}

export async function cancelBookingByCreator(bookingId: string) {
  const user = await requireOnboardedCreator();
  await cancelBookingAsCreator(bookingId, user.creatorProfile.id);
  revalidatePath("/dashboard/products");
}
