import "server-only";
import Stripe from "stripe";
import type {
  CheckoutResult,
  CreateCheckoutParams,
  CreateSubscriptionCheckoutParams,
  PaymentProvider,
  SubscriptionCheckoutResult,
} from "./types";

export class StripePaymentProvider implements PaymentProvider {
  name = "STRIPE" as const;
  private client: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required for PAYMENT_PROVIDER=stripe.");
    this.client = new Stripe(secretKey);
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { orderId: params.orderId, orderNumber: params.orderNumber },
      payment_intent_data: {
        metadata: { orderId: params.orderId, orderNumber: params.orderNumber },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency,
            unit_amount: params.amountMinor,
            product_data: { name: params.productTitle },
          },
        },
      ],
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    return { checkoutUrl: session.url, providerOrderId: session.id };
  }

  async createSubscriptionCheckout(
    params: CreateSubscriptionCheckoutParams,
  ): Promise<SubscriptionCheckoutResult> {
    const session = await this.client.checkout.sessions.create({
      mode: "subscription",
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { subscriptionId: params.subscriptionId },
      subscription_data: { metadata: { subscriptionId: params.subscriptionId } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency,
            unit_amount: params.amountMinor,
            recurring: { interval: params.billingInterval === "MONTHLY" ? "month" : "year" },
            product_data: { name: params.productTitle },
          },
        },
      ],
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    // The real subscription doesn't exist until checkout completes — the
    // `checkout.session.completed` webhook replaces this with `session.subscription`.
    return { checkoutUrl: session.url, providerSubscriptionId: session.id };
  }

  async cancelProviderSubscription(providerSubscriptionId: string) {
    await this.client.subscriptions.update(providerSubscriptionId, { cancel_at_period_end: true });
  }
}

let cachedClient: Stripe | undefined;

export function getStripeClient() {
  if (cachedClient) return cachedClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required for PAYMENT_PROVIDER=stripe.");
  cachedClient = new Stripe(secretKey);
  return cachedClient;
}
