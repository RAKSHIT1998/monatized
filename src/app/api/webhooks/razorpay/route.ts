import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { markOrderFailed, markOrderPaid } from "@/lib/orders";

type RazorpayPaymentLinkWebhookBody = {
  event: string;
  payload: {
    payment_link?: { entity?: { reference_id?: string } };
    payment?: { entity?: { id?: string } };
  };
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return new NextResponse("Missing signature.", { status: 400 });
  }

  const rawBody = await request.text();

  const isValid = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    return new NextResponse("Invalid signature.", { status: 400 });
  }

  const body = JSON.parse(rawBody) as RazorpayPaymentLinkWebhookBody;
  const orderId = body.payload.payment_link?.entity?.reference_id;

  if (orderId) {
    if (body.event === "payment_link.paid") {
      const paymentId = body.payload.payment?.entity?.id ?? `razorpay_${orderId}`;
      await markOrderPaid(orderId, paymentId);
    } else if (body.event === "payment_link.expired" || body.event === "payment_link.cancelled") {
      await markOrderFailed(orderId);
    }
  }

  return NextResponse.json({ received: true });
}
