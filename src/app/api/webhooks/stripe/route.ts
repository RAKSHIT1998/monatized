import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/payments/stripe-provider";
import { markOrderFailed, markOrderPaid } from "@/lib/orders";
import {
  activateSubscription,
  cancelSubscriptionRecord,
  findSubscriptionByProviderId,
  markSubscriptionPastDue,
  renewSubscription,
} from "@/lib/subscriptions";
import {
  activatePlatformSubscription,
  cancelPlatformSubscriptionRecord,
  findPlatformSubscriptionByProviderId,
  markPlatformSubscriptionPastDue,
  renewPlatformSubscription,
} from "@/lib/platform-subscriptions";
import { db } from "@/lib/db";

// As of this Stripe API version, Invoice no longer carries a top-level
// `subscription` field — it's nested under `parent.subscription_details.subscription`.
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const subscription = invoice.parent?.subscription_details?.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return new NextResponse("Missing signature.", { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return new NextResponse("Invalid signature.", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription") {
        const subscriptionId = session.metadata?.subscriptionId;
        const providerSubscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subscriptionId && providerSubscriptionId) {
          if (session.metadata?.kind === "platform") {
            await activatePlatformSubscription(subscriptionId, providerSubscriptionId);
          } else {
            await activateSubscription(subscriptionId, providerSubscriptionId);
          }
        }
      } else {
        const orderId = session.metadata?.orderId;
        if (orderId) {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
          await markOrderPaid(orderId, paymentIntentId ?? session.id);
        }
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) await markOrderFailed(orderId);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const providerSubscriptionId = getInvoiceSubscriptionId(invoice);
      // Only a renewal cycle — the very first invoice is handled by checkout.session.completed above.
      if (providerSubscriptionId && invoice.billing_reason === "subscription_cycle") {
        const subscription = await findSubscriptionByProviderId("STRIPE", providerSubscriptionId);
        if (subscription) {
          await renewSubscription(subscription.id);
        } else {
          const platformSubscription = await findPlatformSubscriptionByProviderId("STRIPE", providerSubscriptionId);
          if (platformSubscription) await renewPlatformSubscription(platformSubscription.id);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const providerSubscriptionId = getInvoiceSubscriptionId(invoice);
      if (providerSubscriptionId) {
        const subscription = await findSubscriptionByProviderId("STRIPE", providerSubscriptionId);
        if (subscription) {
          await markSubscriptionPastDue(subscription.id);
        } else {
          const platformSubscription = await findPlatformSubscriptionByProviderId("STRIPE", providerSubscriptionId);
          if (platformSubscription) await markPlatformSubscriptionPastDue(platformSubscription.id);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const subscription = await findSubscriptionByProviderId("STRIPE", stripeSubscription.id);
      if (subscription) {
        await cancelSubscriptionRecord(subscription.id);
      } else {
        const platformSubscription = await findPlatformSubscriptionByProviderId("STRIPE", stripeSubscription.id);
        if (platformSubscription) await cancelPlatformSubscriptionRecord(platformSubscription.id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const subscription = await findSubscriptionByProviderId("STRIPE", stripeSubscription.id);
      if (subscription) {
        await db.subscription.update({
          where: { id: subscription.id },
          data: { cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end },
        });
      } else {
        const platformSubscription = await findPlatformSubscriptionByProviderId("STRIPE", stripeSubscription.id);
        if (platformSubscription) {
          await db.platformSubscription.update({
            where: { id: platformSubscription.id },
            data: { cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end },
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
