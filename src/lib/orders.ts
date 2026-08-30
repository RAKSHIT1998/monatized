import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { calculateCommissionMinor } from "@/lib/affiliates";
import { runAutomations } from "@/lib/automations";
import { getEmailProvider } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { formatMoney } from "@/lib/money";
import { restoreStock } from "@/lib/stock";

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
    include: {
      items: { include: { product: { include: { digitalFiles: true } } } },
      affiliate: true,
      customer: { select: { email: true } },
      creatorProfile: { select: { displayName: true } },
    },
  });
  if (!order) throw new Error(`Order ${orderId} not found.`);
  if (order.status === "PAID") return; // idempotent — webhooks can retry/duplicate

  const expiresAt = new Date(Date.now() + DOWNLOAD_LINK_LIFETIME_MS);
  const hasPhysicalItem = order.items.some((item) => item.product.type === "PHYSICAL");

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: { status: "PAID", ...(hasPhysicalItem ? { fulfillmentStatus: "UNFULFILLED" } : {}) },
    }),
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
    ...(order.affiliate
      ? [
          db.affiliateReferral.create({
            data: {
              affiliateId: order.affiliate.id,
              orderId: order.id,
              commissionAmountMinor: calculateCommissionMinor(
                order.totalAmountMinor,
                order.affiliate.commissionBps,
              ),
            },
          }),
        ]
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

  await runAutomations(order.creatorProfileId, "ORDER_PAID", {
    customerId: order.customerId,
    customerEmail: order.customer.email,
  });

  await sendOrderConfirmationEmail(order);
}

// Best-effort — there's no customer login system here, so the order page's
// bookmarkable link is a buyer's only way back to their downloads/course/
// booking. A failed send must never fail the payment flow that triggered it,
// same posture as automations above.
async function sendOrderConfirmationEmail(order: {
  id: string;
  orderNumber: string;
  customerId: string;
  totalAmountMinor: number;
  currency: string;
  customer: { email: string };
  creatorProfile: { displayName: string };
  items: { titleSnapshot: string }[];
}) {
  const provider = getEmailProvider();
  const orderUrl = `${getAppUrl()}/order/${order.orderNumber}`;
  const itemLines = order.items.map((item) => `- ${item.titleSnapshot}`).join("\n");
  const subject = `Your order from ${order.creatorProfile.displayName}`;
  const text = [
    `Thanks for your order from ${order.creatorProfile.displayName}!`,
    "",
    itemLines,
    "",
    `Total: ${formatMoney(order.totalAmountMinor, order.currency)}`,
    "",
    `View your order and access your purchase here: ${orderUrl}`,
    "",
    "Bookmark this link — it's how you'll come back to your purchase.",
  ].join("\n");

  let status: "SENT" | "FAILED" = "SENT";
  try {
    await provider.send({ to: order.customer.email, subject, text });
  } catch {
    status = "FAILED";
  }
  await db.emailLog.create({
    data: {
      customerId: order.customerId,
      toEmail: order.customer.email,
      subject,
      provider: provider.name,
      status,
    },
  });
}

export async function markOrderFailed(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      items: {
        select: {
          quantity: true,
          variantId: true,
          product: { select: { id: true, type: true, stockQuantity: true } },
          variant: { select: { stockQuantity: true } },
        },
      },
    },
  });
  if (!order || order.status === "PAID") return; // never regress a completed order

  // Mirror image of the optimistic decrement in startCheckout/startCartCheckout
  // — an order that never got paid never actually took the unit, so give it
  // back to whichever row actually owns the stock: the variant when the item
  // has one, otherwise the product.
  const restoreOps = order.items
    .filter((item) => item.product.type === "PHYSICAL")
    .map((item) => {
      if (item.variantId) {
        if (!item.variant || item.variant.stockQuantity === null) return null;
        return restoreStock(db, { kind: "variant", id: item.variantId }, item.quantity);
      }
      if (item.product.stockQuantity === null) return null;
      return restoreStock(db, { kind: "product", id: item.product.id }, item.quantity);
    })
    .filter((op) => op !== null);

  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status: "FAILED" } }),
    db.payment.update({ where: { orderId }, data: { status: "FAILED" } }),
    // A booking hold for an order that never got paid was never a real
    // confirmation anyone saw — delete it outright to free the calendar slot.
    db.booking.deleteMany({ where: { orderId } }),
    ...restoreOps,
  ]);
}
