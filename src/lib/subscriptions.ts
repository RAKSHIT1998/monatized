import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orders";
import { nextPeriodEnd } from "@/lib/billing-cycle";
import type { PaymentProvider } from "@/generated/prisma/enums";

export function generateSubscriptionAccessToken() {
  return randomBytes(24).toString("base64url");
}

/** Creates a PAID Order + OrderItem for one billing cycle of a subscription. */
async function recordBillingCycle(subscriptionId: string) {
  const subscription = await db.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { product: true },
  });

  const orderNumber = generateOrderNumber();

  await db.$transaction([
    db.order.create({
      data: {
        orderNumber,
        creatorProfileId: subscription.creatorProfileId,
        customerId: subscription.customerId,
        subscriptionId: subscription.id,
        status: "PAID",
        currency: subscription.currency,
        subtotalAmountMinor: subscription.unitAmountMinor,
        totalAmountMinor: subscription.unitAmountMinor,
        items: {
          create: {
            productId: subscription.productId,
            titleSnapshot: subscription.product.title,
            priceAmountMinorSnapshot: subscription.unitAmountMinor,
          },
        },
        payment: {
          create: {
            provider: subscription.provider,
            status: "SUCCEEDED",
            amountMinor: subscription.unitAmountMinor,
            currency: subscription.currency,
          },
        },
      },
    }),
    db.customer.update({
      where: { id: subscription.customerId },
      data: {
        totalSpentMinor: { increment: subscription.unitAmountMinor },
        ordersCount: { increment: 1 },
      },
    }),
    db.analyticsEvent.create({
      data: {
        creatorProfileId: subscription.creatorProfileId,
        type: "ORDER_COMPLETED",
        productId: subscription.productId,
      },
    }),
  ]);
}

/** First successful payment for a brand-new subscription. Idempotent. */
export async function activateSubscription(
  subscriptionId: string,
  providerSubscriptionId: string,
) {
  const subscription = await db.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  if (subscription.status === "ACTIVE") return; // already activated — webhook retry

  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      providerSubscriptionId,
      currentPeriodEnd: nextPeriodEnd(new Date(), subscription.billingInterval),
    },
  });

  await recordBillingCycle(subscriptionId);
}

/** A recurring renewal charge succeeded (real provider webhook, or the mock "simulate renewal" control). */
export async function renewSubscription(subscriptionId: string) {
  const subscription = await db.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });

  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: nextPeriodEnd(
        subscription.currentPeriodEnd ?? new Date(),
        subscription.billingInterval,
      ),
    },
  });

  await recordBillingCycle(subscriptionId);
}

export async function markSubscriptionPastDue(subscriptionId: string) {
  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription || subscription.status === "CANCELLED") return;

  await db.subscription.update({ where: { id: subscriptionId }, data: { status: "PAST_DUE" } });
}

export async function cancelSubscriptionRecord(subscriptionId: string) {
  await db.subscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", cancelAtPeriodEnd: false },
  });
}

export async function findSubscriptionByProviderId(
  provider: PaymentProvider,
  providerSubscriptionId: string,
) {
  return db.subscription.findFirst({ where: { provider, providerSubscriptionId } });
}
