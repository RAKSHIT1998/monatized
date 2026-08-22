export type CreateCheckoutParams = {
  orderId: string;
  orderNumber: string;
  productTitle: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  checkoutUrl: string;
  providerOrderId: string;
};

export type CreateSubscriptionCheckoutParams = {
  subscriptionId: string;
  productTitle: string;
  amountMinor: number;
  currency: string;
  billingInterval: "MONTHLY" | "YEARLY";
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type SubscriptionCheckoutResult = {
  checkoutUrl: string;
  providerSubscriptionId: string;
};

export interface PaymentProvider {
  name: "MOCK" | "RAZORPAY" | "STRIPE";
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult>;
  /**
   * Recurring billing. Optional because not every provider implements it —
   * Razorpay's recurring product (Subscriptions API) needs a pre-created Plan
   * and isn't wired up here; callers must check for its presence and fail
   * clearly rather than silently falling back to a one-time charge.
   */
  createSubscriptionCheckout?(
    params: CreateSubscriptionCheckoutParams,
  ): Promise<SubscriptionCheckoutResult>;
  /** Cancel at the current period's end — the provider stops future renewals but keeps existing access intact. */
  cancelProviderSubscription?(providerSubscriptionId: string): Promise<void>;
}
