"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { getPaymentProvider } from "@/lib/payments";
import {
  cancelSubscriptionRecord,
  renewSubscription,
  markSubscriptionPastDue,
} from "@/lib/subscriptions";

async function requestCancellation(subscription: {
  id: string;
  provider: "MOCK" | "RAZORPAY" | "STRIPE";
  providerSubscriptionId: string | null;
}) {
  const provider = getPaymentProvider();

  if (subscription.provider !== "MOCK" && subscription.providerSubscriptionId && provider.cancelProviderSubscription) {
    // Graceful cancellation — keeps access through the period already paid for.
    // The provider stops future renewals; our own status flips to CANCELLED
    // when its "subscription deleted" webhook fires at period end.
    await provider.cancelProviderSubscription(subscription.providerSubscriptionId);
    await db.subscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: true } });
  } else {
    // MOCK has no external billing to stop, and an INCOMPLETE subscription
    // (no provider subscription created yet) has nothing to cancel upstream either.
    await cancelSubscriptionRecord(subscription.id);
  }
}

export async function cancelSubscriptionAsCreator(subscriptionId: string) {
  const user = await requireOnboardedCreator();
  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Subscription not found.");
  }

  await requestCancellation(subscription);
  revalidatePath(`/dashboard/products/${subscription.productId}`);
  revalidatePath("/dashboard/subscriptions");
}

export async function cancelSubscriptionAsMember(accessToken: string) {
  const subscription = await db.subscription.findUnique({ where: { accessToken } });
  if (!subscription) throw new Error("Subscription not found.");

  await requestCancellation(subscription);
  revalidatePath(`/member/${accessToken}`);
}

// Dev/demo-only lifecycle controls, gated to MOCK subscriptions exactly like
// completeMockPayment/completeMockSubscription — never usable on a real provider.
export async function simulateRenewal(accessToken: string) {
  const subscription = await db.subscription.findUnique({ where: { accessToken } });
  if (!subscription || subscription.provider !== "MOCK") {
    throw new Error("This action is only available for mock subscriptions.");
  }
  await renewSubscription(subscription.id);
  revalidatePath(`/member/${accessToken}`);
}

export async function simulatePastDue(accessToken: string) {
  const subscription = await db.subscription.findUnique({ where: { accessToken } });
  if (!subscription || subscription.provider !== "MOCK") {
    throw new Error("This action is only available for mock subscriptions.");
  }
  await markSubscriptionPastDue(subscription.id);
  revalidatePath(`/member/${accessToken}`);
}
