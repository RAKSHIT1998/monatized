import "server-only";
import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./mock-provider";
import { StripePaymentProvider } from "./stripe-provider";
import { RazorpayPaymentProvider } from "./razorpay-provider";

let provider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;

  switch (process.env.PAYMENT_PROVIDER) {
    case "stripe":
      provider = new StripePaymentProvider();
      break;
    case "razorpay":
      provider = new RazorpayPaymentProvider();
      break;
    default:
      provider = new MockPaymentProvider();
  }

  return provider;
}

export type { PaymentProvider, CreateCheckoutParams, CheckoutResult } from "./types";
