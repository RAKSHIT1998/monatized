import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminRefundButton } from "./admin-refund-button";

export const metadata: Metadata = {
  title: "Order — Monetized Admin",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
};

type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      payment: true,
      coupon: { select: { code: true } },
      creatorProfile: { select: { id: true, username: true, displayName: true } },
    },
  });

  if (!order) notFound();

  const shippingAddress = order.shippingAddress as ShippingAddress | null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/orders"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-xl font-semibold tracking-tight">{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Placed {order.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} on{" "}
              <Link href={`/admin/creators/${order.creatorProfile.id}`} className="underline underline-offset-4">
                {order.creatorProfile.displayName}
              </Link>
              &apos;s store
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
            {order.status === "PAID" && (
              <AdminRefundButton
                orderId={order.id}
                amountMinor={order.totalAmountMinor}
                currency={order.currency}
                customerEmail={order.customer.email}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    {item.quantity}x {item.titleSnapshot}
                    {item.variantLabel && ` — ${item.variantLabel}`}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(item.priceAmountMinorSnapshot * item.quantity, order.currency)}
                  </span>
                </div>
              ))}
              <div className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatMoney(order.subtotalAmountMinor, order.currency)}</span>
                </div>
                {order.discountAmountMinor > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Coupon {order.coupon?.code}</span>
                    <span className="tabular-nums">-{formatMoney(order.discountAmountMinor, order.currency)}</span>
                  </div>
                )}
                {order.shippingFeeAmountMinor > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="tabular-nums">{formatMoney(order.shippingFeeAmountMinor, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMoney(order.totalAmountMinor, order.currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform fee</span>
                  <span className="tabular-nums">{formatMoney(order.platformFeeAmountMinor, order.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.buyerNote && (
            <Card>
              <CardHeader>
                <CardTitle>Note from buyer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.buyerNote}</p>
              </CardContent>
            </Card>
          )}

          {order.fulfillmentStatus !== "NOT_APPLICABLE" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Fulfillment</CardTitle>
                <Badge variant={order.fulfillmentStatus === "SHIPPED" ? "default" : "secondary"}>
                  {order.fulfillmentStatus}
                </Badge>
              </CardHeader>
              {shippingAddress && (
                <CardContent className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Truck className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{shippingAddress.name}</p>
                    <p>{shippingAddress.line1}</p>
                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                    <p>
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                    </p>
                    <p>{shippingAddress.country}</p>
                    {shippingAddress.phone && <p>{shippingAddress.phone}</p>}
                    {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {order.customer.name && <p className="font-medium">{order.customer.name}</p>}
              <p className={order.customer.name ? "text-muted-foreground" : "font-medium"}>
                {order.customer.email}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Provider: {order.payment?.provider ?? "—"}</p>
              <p>Status: {order.payment?.status ?? "—"}</p>
              {order.payment?.providerPaymentId && (
                <p className="break-all font-mono text-xs">{order.payment.providerPaymentId}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
