import "server-only";
import type {
  CheckoutResult,
  CreateCheckoutParams,
  CreateSubscriptionCheckoutParams,
  PaymentProvider,
  SubscriptionCheckoutResult,
} from "./types";

// Simulates a hosted checkout redirect with no external calls. Dev/demo only —
// the "payment" is confirmed by clicking a clearly-labeled simulate button,
// never silently auto-approved.
export class MockPaymentProvider implements PaymentProvider {
  name = "MOCK" as const;

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    return {
      checkoutUrl: `/checkout/mock/${params.orderId}`,
      providerOrderId: `mock_${params.orderId}`,
    };
  }

  async createSubscriptionCheckout(
    params: CreateSubscriptionCheckoutParams,
  ): Promise<SubscriptionCheckoutResult> {
    return {
      checkoutUrl: `/checkout/mock-subscription/${params.subscriptionId}`,
      providerSubscriptionId: `mock_sub_${params.subscriptionId}`,
    };
  }

  async cancelProviderSubscription() {
    // Nothing external to cancel — the mock subscription lifecycle lives entirely in our own DB.
  }
}
