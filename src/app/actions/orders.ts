"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { getPaymentProvider } from "@/lib/payments";

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

export async function refundOrder(orderId: string) {
  const user = await requireOnboardedCreator();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order || order.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Order not found.");
  }
  if (order.status !== "PAID") {
    throw new Error("Only paid orders can be refunded.");
  }

  // A coupon covering 100% of the price never actually charged the payment
  // provider (see startCheckout) — nothing to refund there, same reasoning
  // in reverse.
  if (order.totalAmountMinor > 0) {
    if (!order.payment?.providerPaymentId) {
      throw new Error("This order has no payment on file to refund.");
    }
    const provider = getPaymentProvider();
    if (order.payment.provider !== provider.name) {
      throw new Error(
        `This order was paid via ${order.payment.provider}, but the configured payment provider is ${provider.name}. Refund it from wherever that payment actually happened.`,
      );
    }
    await provider.refundPayment({
      providerPaymentId: order.payment.providerPaymentId,
      amountMinor: order.totalAmountMinor,
      currency: order.currency,
    });
  }

  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } }),
    db.payment.update({ where: { orderId }, data: { status: "REFUNDED" } }),
    // Reverses the increment from markOrderPaid — refunded money was never
    // really "spent". ordersCount is left alone: it's a lifetime count of
    // orders placed, not a count of money currently kept.
    db.customer.update({
      where: { id: order.customerId },
      data: { totalSpentMinor: { decrement: order.totalAmountMinor } },
    }),
    // The item is no longer paid for — expire any download links immediately
    // rather than letting them run out their normal 7-day/5-download life.
    db.downloadGrant.updateMany({ where: { orderId }, data: { expiresAt: new Date() } }),
    db.auditLog.create({
      data: { actorUserId: user.id, action: "order.refunded", targetType: "Order", targetId: orderId },
    }),
  ]);

  revalidatePath("/dashboard/orders");
}
