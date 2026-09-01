"use server";

import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getEmailProvider } from "@/lib/email";
import { escapeHtml, renderEmailLayout } from "@/lib/email/layout";
import { getAppUrl } from "@/lib/app-url";
import { formatMoney } from "@/lib/money";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export type OrderRecoveryFormState = { message?: string } | undefined;

// Never discloses whether the email has any orders — same posture as
// requestPasswordReset in actions/auth.ts, for the same reason: the
// response itself must not be usable to enumerate real customers.
const GENERIC_MESSAGE = "If we found any orders for that email, we've sent the links to view them.";

export async function requestOrderRecovery(
  _prevState: OrderRecoveryFormState,
  formData: FormData,
): Promise<OrderRecoveryFormState> {
  const validated = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!validated.success) return { message: GENERIC_MESSAGE };
  const { email } = validated.data;

  // Per-email and per-IP, mirroring requestPasswordReset's two-bucket shape.
  const ip = await getClientIp();
  const emailLimit = checkRateLimit(`order-recovery:email:${email}`, 5, 60 * 60 * 1000);
  const ipLimit = checkRateLimit(`order-recovery:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!emailLimit.allowed || !ipLimit.allowed) return { message: GENERIC_MESSAGE };

  // A buyer's email isn't unique platform-wide — the same address can be a
  // Customer under several different creators (schema unique key is
  // [creatorProfileId, email]), so this can legitimately match more than
  // one row and sends one email per creator relationship found.
  const customers = await db.customer.findMany({
    where: { email },
    include: {
      orders: {
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        select: { orderNumber: true, totalAmountMinor: true, currency: true },
      },
      creatorProfile: { select: { displayName: true } },
    },
  });

  const provider = getEmailProvider();
  const appUrl = getAppUrl();

  for (const customer of customers) {
    if (customer.orders.length === 0) continue;

    const lines = customer.orders.map(
      (order) =>
        `- ${order.orderNumber} (${formatMoney(order.totalAmountMinor, order.currency)}): ${appUrl}/order/${order.orderNumber}`,
    );
    const subject = `Your orders from ${customer.creatorProfile.displayName}`;
    const text = [`Here are your orders from ${customer.creatorProfile.displayName}:`, "", ...lines].join("\n");
    const html = renderEmailLayout(
      `Your orders from ${escapeHtml(customer.creatorProfile.displayName)}`,
      `
      <ul style="margin:0;padding-left:20px;font-size:14px;">
        ${customer.orders
          .map(
            (order) =>
              `<li><a href="${appUrl}/order/${order.orderNumber}" style="color:#171717;">${order.orderNumber}</a> — ${formatMoney(order.totalAmountMinor, order.currency)}</li>`,
          )
          .join("")}
      </ul>
      `,
    );

    let status: "SENT" | "FAILED" = "SENT";
    try {
      await provider.send({ to: email, subject, text, html });
    } catch {
      status = "FAILED";
    }
    await db.emailLog.create({
      data: { customerId: customer.id, toEmail: email, subject, provider: provider.name, status },
    });
  }

  return { message: GENERIC_MESSAGE };
}
