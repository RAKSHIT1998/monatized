import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { generateAvailableSlots } from "@/lib/booking-slots";

const SLOT_WINDOW_DAYS = 14;

export function generateBookingAccessToken() {
  return randomBytes(24).toString("base64url");
}

/** Every open slot for a BOOKING product over the next two weeks. */
export async function getAvailableSlotsForProduct(productId: string): Promise<Date[]> {
  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
    include: { availabilityRules: true },
  });
  if (!product.bookingDurationMinutes || product.availabilityRules.length === 0) return [];

  const existing = await db.booking.findMany({
    where: { productId, status: "CONFIRMED" },
    select: { startsAt: true, endsAt: true },
  });

  const now = new Date();
  const to = new Date(now.getTime() + SLOT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  return generateAvailableSlots({
    rules: product.availabilityRules,
    booked: existing,
    durationMinutes: product.bookingDurationMinutes,
    from: now,
    to,
    now,
  });
}

// Soft-cancel: the slot itself is not automatically returned to availability
// (the (productId, startsAt) unique constraint still holds it) — see README
// "Known items". This keeps a visible cancelled record for a booking that was
// actually paid for, unlike the never-paid case above.
export async function cancelBookingAsMember(accessToken: string) {
  const booking = await db.booking.findUnique({ where: { accessToken } });
  if (!booking || booking.status === "CANCELLED") return;
  await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
}

export async function cancelBookingAsCreator(bookingId: string, creatorProfileId: string) {
  const owned = await db.booking.findFirst({
    where: { id: bookingId, product: { creatorProfileId } },
  });
  if (!owned || owned.status === "CANCELLED") return;
  await db.booking.update({ where: { id: owned.id }, data: { status: "CANCELLED" } });
}
