import "server-only";
import Razorpay from "razorpay";
import type { CheckoutResult, CreateCheckoutParams, PaymentProvider } from "./types";

export class RazorpayPaymentProvider implements PaymentProvider {
  name = "RAZORPAY" as const;
  private client: Razorpay;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for PAYMENT_PROVIDER=razorpay.");
    }
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const paymentLink = await this.client.paymentLink.create({
      amount: params.amountMinor,
      currency: params.currency,
      description: params.productTitle,
      reference_id: params.orderId,
      customer: { email: params.customerEmail },
      notify: { email: false, sms: false },
      callback_url: params.successUrl,
      callback_method: "get",
    });

    return { checkoutUrl: paymentLink.short_url, providerOrderId: paymentLink.id };
  }
}
