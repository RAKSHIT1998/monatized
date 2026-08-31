"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { getPaymentProvider } from "@/lib/payments";
import { getAppUrl } from "@/lib/app-url";
import { computeProrationCredit } from "@/lib/billing-cycle";
import {
  activatePlatformSubscription,
  cancelPlatformSubscriptionRecord,
  markPlatformSubscriptionPastDue,
  renewPlatformSubscription,
} from "@/lib/platform-subscriptions";

export async function startPlanUpgrade(planId: string) {
  const user = await requireOnboardedCreator();
  const provider = getPaymentProvider();
  if (!provider.createSubscriptionCheckout) {
    throw new Error(
      `Plan upgrades aren't supported with the ${provider.name.toLowerCase()} payment provider yet.`,
    );
  }

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new Error("This plan is no longer available.");
  if (plan.priceMonthlyMinor <= 0) throw new Error("Use the downgrade action for the Free plan.");
  if (plan.id === user.creatorProfile.plan.id) throw new Error("You're already on this plan.");

  // If they already have an active paid plan, stop billing it provider-side
  // before starting a new one, and credit whatever's unused on it toward the
  // new plan's first charge.
  const existing = await db.platformSubscription.findUnique({
    where: { creatorProfileId: user.creatorProfile.id },
  });
  if (
    existing &&
    existing.status !== "CANCELLED" &&
    existing.provider !== "MOCK" &&
    existing.providerSubscriptionId &&
    provider.cancelProviderSubscription
  ) {
    await provider.cancelProviderSubscription(existing.providerSubscriptionId);
  }

  // Only an ACTIVE plan was actually paid for — PAST_DUE gets no credit for
  // a period whose charge never went through. Capped at the new plan's
  // price: never a negative charge, and any leftover credit is forfeited
  // rather than carried forward or refunded in cash.
  let creditMinor = 0;
  if (existing?.status === "ACTIVE" && existing.currentPeriodEnd && existing.currency === plan.currency) {
    creditMinor = Math.min(
      computeProrationCredit(existing.unitAmountMinor, existing.currentPeriodEnd, new Date()),
      plan.priceMonthlyMinor,
    );
  }
  const firstChargeMinor = plan.priceMonthlyMinor - creditMinor;

  // creatorProfileId is unique — one row per creator for life, reused across
  // upgrades/cancellations rather than recreated. The historical ledger of
  // actual charges lives in PlatformPayment instead, which has no such
  // constraint. unitAmountMinor always stays the new plan's full recurring
  // price — pendingChargeMinor carries a prorated first charge separately.
  const subscription = await db.platformSubscription.upsert({
    where: { creatorProfileId: user.creatorProfile.id },
    create: {
      creatorProfileId: user.creatorProfile.id,
      planId: plan.id,
      status: "INCOMPLETE",
      provider: provider.name,
      unitAmountMinor: plan.priceMonthlyMinor,
      currency: plan.currency,
    },
    update: {
      planId: plan.id,
      status: "INCOMPLETE",
      provider: provider.name,
      providerSubscriptionId: null,
      unitAmountMinor: plan.priceMonthlyMinor,
      currency: plan.currency,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      pendingChargeMinor: creditMinor > 0 ? firstChargeMinor : null,
    },
  });

  // A large-enough prorated credit can cover the new plan's full price —
  // nothing to charge, so activate directly rather than sending a $0
  // request the provider may reject, mirroring the $0 coupon-covered order
  // skip in actions/checkout.ts.
  if (firstChargeMinor === 0) {
    await activatePlatformSubscription(subscription.id, "zero_amount_credit");
    revalidatePath("/dashboard/billing");
    redirect("/dashboard/billing");
  }

  const appUrl = getAppUrl();

  // redirect() throws Next.js's own control-flow signal — it must stay
  // outside this try/catch, same reasoning as startSubscriptionCheckout in
  // checkout.ts.
  let checkoutUrl: string;
  try {
    const result = await provider.createSubscriptionCheckout({
      subscriptionId: subscription.id,
      kind: "platform",
      productTitle: `${plan.name} plan`,
      amountMinor: plan.priceMonthlyMinor,
      currency: plan.currency,
      billingInterval: "MONTHLY",
      customerEmail: user.email,
      successUrl: `${appUrl}/dashboard/billing`,
      cancelUrl: `${appUrl}/dashboard/billing`,
      firstInvoiceDiscountMinor: creditMinor > 0 ? creditMinor : undefined,
    });
    await db.platformSubscription.update({
      where: { id: subscription.id },
      data: { providerSubscriptionId: result.providerSubscriptionId },
    });
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    await cancelPlatformSubscriptionRecord(subscription.id);
    throw error;
  }

  redirect(checkoutUrl);
}

// Returns whether the downgrade already happened (MOCK — nothing external to
// wind down) or is scheduled for period end (a real provider) — the caller
// needs this to show an accurate confirmation instead of a generic one.
export async function cancelMyPlatformPlan(): Promise<{ immediate: boolean }> {
  const user = await requireOnboardedCreator();
  const subscription = await db.platformSubscription.findUnique({
    where: { creatorProfileId: user.creatorProfile.id },
  });
  if (!subscription) throw new Error("You don't have a paid plan to cancel.");

  const provider = getPaymentProvider();
  let immediate: boolean;
  if (subscription.provider !== "MOCK" && subscription.providerSubscriptionId && provider.cancelProviderSubscription) {
    // Graceful cancellation — keeps the plan's features through the period
    // already paid for. Our own status flips to CANCELLED (and the creator
    // downgrades to Free) when the provider's "subscription deleted" webhook
    // fires at period end.
    await provider.cancelProviderSubscription(subscription.providerSubscriptionId);
    await db.platformSubscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });
    immediate = false;
  } else {
    // MOCK has no external billing to stop — downgrade immediately.
    await cancelPlatformSubscriptionRecord(subscription.id);
    immediate = true;
  }

  revalidatePath("/dashboard/billing");
  return { immediate };
}

// Dev/demo-only lifecycle controls, gated to MOCK subscriptions exactly like
// the buyer-subscription equivalents in actions/subscriptions.ts.
export async function simulatePlatformRenewal() {
  const user = await requireOnboardedCreator();
  const subscription = await db.platformSubscription.findUnique({
    where: { creatorProfileId: user.creatorProfile.id },
  });
  if (!subscription || subscription.provider !== "MOCK") {
    throw new Error("This action is only available for mock plan subscriptions.");
  }
  await renewPlatformSubscription(subscription.id);
  revalidatePath("/dashboard/billing");
}

export async function simulatePlatformPastDue() {
  const user = await requireOnboardedCreator();
  const subscription = await db.platformSubscription.findUnique({
    where: { creatorProfileId: user.creatorProfile.id },
  });
  if (!subscription || subscription.provider !== "MOCK") {
    throw new Error("This action is only available for mock plan subscriptions.");
  }
  await markPlatformSubscriptionPastDue(subscription.id);
  revalidatePath("/dashboard/billing");
}

// Only ever completes subscriptions created with the MOCK provider — same
// rationale as completeMockSubscription in actions/checkout.ts.
export async function completeMockPlatformSubscription(
  platformSubscriptionId: string,
  outcome: "success" | "failure",
) {
  const subscription = await db.platformSubscription.findUnique({
    where: { id: platformSubscriptionId },
  });
  if (!subscription || subscription.provider !== "MOCK") {
    throw new Error("This plan checkout can't be completed here.");
  }

  if (outcome === "success") {
    await activatePlatformSubscription(subscription.id, `mock_platform_sub_${subscription.id}`);
  } else {
    await cancelPlatformSubscriptionRecord(subscription.id);
  }

  redirect("/dashboard/billing");
}
