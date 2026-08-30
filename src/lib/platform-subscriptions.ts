import "server-only";
import { db } from "@/lib/db";
import { nextPeriodEnd } from "@/lib/billing-cycle";
import { getEmailProvider } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { formatMoney } from "@/lib/money";
import type { PaymentProvider } from "@/generated/prisma/enums";

/** Records one successful charge — the first, or a renewal — for admin revenue history. */
async function recordPlatformPayment(platformSubscriptionId: string) {
  const subscription = await db.platformSubscription.findUniqueOrThrow({
    where: { id: platformSubscriptionId },
  });

  await db.platformPayment.create({
    data: {
      platformSubscriptionId: subscription.id,
      creatorProfileId: subscription.creatorProfileId,
      amountMinor: subscription.unitAmountMinor,
      currency: subscription.currency,
      provider: subscription.provider,
    },
  });
}

/** First successful payment for a brand-new platform subscription. Idempotent. */
export async function activatePlatformSubscription(
  platformSubscriptionId: string,
  providerSubscriptionId: string,
) {
  const subscription = await db.platformSubscription.findUniqueOrThrow({
    where: { id: platformSubscriptionId },
    include: {
      plan: true,
      creatorProfile: { include: { user: { select: { email: true } } } },
    },
  });
  if (subscription.status === "ACTIVE") return; // already activated — webhook retry

  await db.$transaction([
    db.platformSubscription.update({
      where: { id: platformSubscriptionId },
      data: {
        status: "ACTIVE",
        providerSubscriptionId,
        currentPeriodEnd: nextPeriodEnd(new Date(), "MONTHLY"),
      },
    }),
    // The actual upgrade — everything gated by hasFeatureAccess/plan-limits
    // reads this field.
    db.creatorProfile.update({
      where: { id: subscription.creatorProfileId },
      data: { planId: subscription.planId },
    }),
  ]);

  await recordPlatformPayment(platformSubscriptionId);
  await sendPlanConfirmationEmail(subscription);
}

// Best-effort, first-charge-only — mirrors sendWelcomeEmail's posture in
// subscriptions.ts (never resent on renewal, never allowed to fail the
// activation it's reporting on).
async function sendPlanConfirmationEmail(subscription: {
  creatorProfileId: string;
  unitAmountMinor: number;
  currency: string;
  plan: { name: string };
  creatorProfile: { user: { email: string } };
}) {
  const provider = getEmailProvider();
  const billingUrl = `${getAppUrl()}/dashboard/billing`;
  const subject = `You're on ${subscription.plan.name} — Monetized`;
  const text = [
    `You're now on the ${subscription.plan.name} plan (${formatMoney(subscription.unitAmountMinor, subscription.currency)}/month).`,
    "",
    `Manage your plan anytime: ${billingUrl}`,
  ].join("\n");

  let status: "SENT" | "FAILED" = "SENT";
  try {
    await provider.send({ to: subscription.creatorProfile.user.email, subject, text });
  } catch {
    status = "FAILED";
  }
  await db.emailLog.create({
    data: {
      toEmail: subscription.creatorProfile.user.email,
      subject,
      provider: provider.name,
      status,
    },
  });
}

/** A recurring renewal charge succeeded (real provider webhook, or the mock "simulate renewal" control). */
export async function renewPlatformSubscription(platformSubscriptionId: string) {
  const subscription = await db.platformSubscription.findUniqueOrThrow({
    where: { id: platformSubscriptionId },
  });

  await db.platformSubscription.update({
    where: { id: platformSubscriptionId },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: nextPeriodEnd(subscription.currentPeriodEnd ?? new Date(), "MONTHLY"),
    },
  });

  await recordPlatformPayment(platformSubscriptionId);
}

export async function markPlatformSubscriptionPastDue(platformSubscriptionId: string) {
  const subscription = await db.platformSubscription.findUnique({
    where: { id: platformSubscriptionId },
  });
  if (!subscription || subscription.status === "CANCELLED") return;

  await db.platformSubscription.update({
    where: { id: platformSubscriptionId },
    data: { status: "PAST_DUE" },
  });
}

/** Actually cancelled (real provider "subscription deleted" webhook, or immediate for MOCK) — downgrades back to Free. */
export async function cancelPlatformSubscriptionRecord(platformSubscriptionId: string) {
  const subscription = await db.platformSubscription.findUnique({
    where: { id: platformSubscriptionId },
  });
  if (!subscription || subscription.status === "CANCELLED") return;

  const freePlan = await db.plan.findUniqueOrThrow({ where: { key: "FREE" } });

  await db.$transaction([
    db.platformSubscription.update({
      where: { id: platformSubscriptionId },
      data: { status: "CANCELLED", cancelAtPeriodEnd: false },
    }),
    db.creatorProfile.update({
      where: { id: subscription.creatorProfileId },
      data: { planId: freePlan.id },
    }),
  ]);
}

export async function findPlatformSubscriptionByProviderId(
  provider: PaymentProvider,
  providerSubscriptionId: string,
) {
  return db.platformSubscription.findFirst({ where: { provider, providerSubscriptionId } });
}
