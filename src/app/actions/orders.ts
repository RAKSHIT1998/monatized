"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";

export async function markOrderShipped(orderId: string, trackingNumber: string) {
  const user = await requireOnboardedCreator();

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Order not found.");
  }
  if (order.status !== "PAID") {
    throw new Error("Only paid orders can be marked shipped.");
  }
  if (order.fulfillmentStatus === "NOT_APPLICABLE") {
    throw new Error("This order has nothing to ship.");
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: "SHIPPED",
      trackingNumber: trackingNumber.trim() || null,
      shippedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/orders");
}
