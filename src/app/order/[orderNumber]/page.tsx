import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, CheckCircle2, XCircle, Clock, GraduationCap, CalendarCheck, Truck, Heart } from "lucide-react";
import { OrderStatusPoller } from "./order-status-poller";
import { ClearCartOnPaid } from "./clear-cart-on-paid";

export const metadata: Metadata = {
  title: "Your order — Monetized",
};

type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

// A torn-edge bottom, the same technique as the landing page's receipt
// graphic (ReceiptTicker) but built from theme tokens so it works in both
// light and dark mode, rather than that component's fixed marketing colors.
const TORN_EDGE_CLIP_PATH =
  "polygon(0% 0%, 100% 0%, 100% 97%, 96% 100%, 92% 97%, 88% 100%, 84% 97%, 80% 100%, 76% 97%, 72% 100%, 68% 97%, 64% 100%, 60% 97%, 56% 100%, 52% 97%, 48% 100%, 44% 97%, 40% 100%, 36% 97%, 32% 100%, 28% 97%, 24% 100%, 20% 97%, 16% 100%, 12% 97%, 8% 100%, 4% 97%, 0% 100%)";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: true } },
      creatorProfile: true,
      downloadGrants: { include: { digitalProductFile: true } },
      courseEnrollment: { include: { product: true } },
      booking: { include: { product: true } },
      coupon: true,
    },
  });

  if (!order) notFound();

  const retryHref =
    order.items.length > 1
      ? `/${order.creatorProfile.username}/cart`
      : order.items[0]
        ? `/${order.creatorProfile.username}/${order.items[0].product.slug}`
        : `/${order.creatorProfile.username}`;

  const isPaid = order.status === "PAID";
  const hasPhysicalItem = order.items.some((item) => item.product.type === "PHYSICAL");
  const isTip = order.items.some((item) => item.product.type === "TIP");
  const shippingAddress = order.shippingAddress as ShippingAddress | null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-12">
      <ClearCartOnPaid username={order.creatorProfile.username} paid={isPaid} />
      {order.status === "PENDING" && <OrderStatusPoller />}

      <Card
        className={cn(isPaid && "gap-0 overflow-visible bg-transparent p-0 shadow-none ring-0")}
      >
        <div
          className={cn(isPaid && "bg-card rounded-t-xl border pt-6 pb-8 shadow-sm")}
          style={isPaid ? { clipPath: TORN_EDGE_CLIP_PATH } : undefined}
        >
          <CardHeader className="items-center text-center">
            {order.status === "PAID" && <CheckCircle2 className="size-10 text-emerald-600" />}
            {order.status === "PENDING" && <Clock className="size-10 text-muted-foreground" />}
            {order.status === "FAILED" && <XCircle className="size-10 text-destructive" />}

            <CardTitle>
              {order.status === "PAID" && "Thank you for your purchase!"}
              {order.status === "PENDING" && "Confirming your payment…"}
              {order.status === "FAILED" && "Payment didn't go through"}
            </CardTitle>
            <p className={cn("text-sm text-muted-foreground", isPaid && "font-mono text-xs tracking-wide")}>
              {isPaid ? `ORDER #${order.orderNumber}` : `Order ${order.orderNumber}`}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isPaid ? (
              <div className="flex flex-col gap-1.5 border-t border-dashed pt-4 font-mono text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-3">
                    <span className="truncate">
                      {item.quantity}x {item.titleSnapshot}
                      {item.variantLabel && ` — ${item.variantLabel}`}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatMoney(item.priceAmountMinorSnapshot * item.quantity, order.currency)}
                    </span>
                  </div>
                ))}
                {order.discountAmountMinor > 0 && (
                  <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
                    <span className="truncate">Coupon {order.coupon?.code}</span>
                    <span className="shrink-0 tabular-nums">
                      -{formatMoney(order.discountAmountMinor, order.currency)}
                    </span>
                  </div>
                )}
                {order.shippingFeeAmountMinor > 0 && (
                  <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
                    <span className="truncate">Shipping</span>
                    <span className="shrink-0 tabular-nums">
                      {formatMoney(order.shippingFeeAmountMinor, order.currency)}
                    </span>
                  </div>
                )}
                <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-dashed pt-2 text-base font-bold">
                  <span>TOTAL</span>
                  <span className="tabular-nums">
                    {formatMoney(order.totalAmountMinor, order.currency)}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium">
                      {item.quantity}x {item.titleSnapshot}
                      {item.variantLabel && ` — ${item.variantLabel}`}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatMoney(item.priceAmountMinorSnapshot * item.quantity, order.currency)}
                    </span>
                  </div>
                ))}

                {(order.discountAmountMinor > 0 || order.shippingFeeAmountMinor > 0) && (
                  <div className="flex flex-col gap-1 text-sm">
                    {order.discountAmountMinor > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Coupon {order.coupon?.code}</span>
                        <span>-{formatMoney(order.discountAmountMinor, order.currency)}</span>
                      </div>
                    )}
                    {order.shippingFeeAmountMinor > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span>{formatMoney(order.shippingFeeAmountMinor, order.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{formatMoney(order.totalAmountMinor, order.currency)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {order.status === "PAID" && order.downloadGrants.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Your downloads</p>
                {order.downloadGrants.map((grant) => (
                  <a
                    key={grant.id}
                    href={`/api/download/${grant.token}`}
                    className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
                  >
                    <Download className="size-4" />
                    {grant.digitalProductFile.fileName}
                  </a>
                ))}
                <p className="text-xs text-muted-foreground">
                  Links expire in 7 days and allow up to 5 downloads each.
                </p>
              </div>
            )}

            {order.status === "PAID" && order.courseEnrollment && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Your course</p>
                <Link
                  href={`/learn/${order.courseEnrollment.accessToken}`}
                  className={cn(buttonVariants(), "justify-start")}
                >
                  <GraduationCap className="size-4" />
                  Start learning: {order.courseEnrollment.product.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Bookmark this link — it&apos;s how you&apos;ll come back to your course.
                </p>
              </div>
            )}

            {order.status === "PAID" && order.booking && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Your booking</p>
                <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <CalendarCheck className="size-4 shrink-0" />
                  {order.booking.startsAt.toLocaleString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <Link
                  href={`/booking/${order.booking.accessToken}`}
                  className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
                >
                  View or cancel this booking
                </Link>
                <p className="text-xs text-muted-foreground">
                  Bookmark this link — it&apos;s how you&apos;ll come back to your booking.
                </p>
              </div>
            )}

            {order.status === "PAID" && hasPhysicalItem && shippingAddress && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Shipping to</p>
                <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="text-muted-foreground">
                    <p className="font-medium text-foreground">{shippingAddress.name}</p>
                    <p>{shippingAddress.line1}</p>
                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                    <p>
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                    </p>
                    <p>{shippingAddress.country}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {order.fulfillmentStatus === "SHIPPED"
                    ? `Shipped${order.trackingNumber ? ` — tracking: ${order.trackingNumber}` : "."}`
                    : "We'll email you when this ships."}
                </p>
              </div>
            )}

            {order.status === "PAID" && isTip && (
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                <Heart className="size-4 shrink-0 text-rose-500" />
                Thank you for the support — it means a lot.
              </div>
            )}

            {order.status === "FAILED" && (
              <Link href={retryHref} className={buttonVariants()}>
                Try again
              </Link>
            )}

            {order.status === "PENDING" && (
              <p className="text-sm text-muted-foreground">
                This page will update automatically. If it doesn&apos;t within a minute, refresh.
              </p>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
