import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export function generateOrderNumber() {
  return `MON-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function generateDownloadToken() {
  return randomBytes(24).toString("base64url");
}

function generateAccessToken() {
  return randomBytes(24).toString("base64url");
}

const DOWNLOAD_LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const DOWNLOAD_LIMIT_PER_GRANT = 5;

export async function markOrderPaid(orderId: string, providerPaymentId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { digitalFiles: true } } } } },
  });
  if (!order) throw new Error(`Order ${orderId} not found.`);
  if (order.status === "PAID") return; // idempotent — webhooks can retry/duplicate

  const expiresAt = new Date(Date.now() + DOWNLOAD_LINK_LIFETIME_MS);

  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "PAID" } }),
    db.payment.update({
      where: { orderId },
      data: { status: "SUCCEEDED", providerPaymentId },
    }),
    db.customer.update({
      where: { id: order.customerId },
      data: {
        totalSpentMinor: { increment: order.totalAmountMinor },
        ordersCount: { increment: 1 },
      },
    }),
    ...order.items.flatMap((item) =>
      item.product.digitalFiles.map((file) =>
        db.downloadGrant.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            digitalProductFileId: file.id,
            token: generateDownloadToken(),
            downloadLimit: DOWNLOAD_LIMIT_PER_GRANT,
            expiresAt,
          },
        }),
      ),
    ),
    ...order.items
      .filter((item) => item.product.type === "COURSE")
      .map((item) =>
        db.courseEnrollment.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            customerId: order.customerId,
            accessToken: generateAccessToken(),
          },
        }),
      ),
    ...(order.couponId
      ? [db.coupon.update({ where: { id: order.couponId }, data: { redemptionCount: { increment: 1 } } })]
      : []),
    db.analyticsEvent.create({
      data: { creatorProfileId: order.creatorProfileId, type: "ORDER_COMPLETED", orderId: order.id },
    }),
    db.auditLog.create({
      data: {
        action: "order.paid",
        targetType: "Order",
        targetId: order.id,
        metadata: { providerPaymentId },
      },
    }),
  ]);
}

export async function markOrderFailed(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order || order.status === "PAID") return; // never regress a completed order

  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "FAILED" } }),
    db.payment.update({ where: { orderId }, data: { status: "FAILED" } }),
  ]);
}
