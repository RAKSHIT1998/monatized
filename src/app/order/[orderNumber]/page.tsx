import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, CheckCircle2, XCircle, Clock, GraduationCap, CalendarCheck } from "lucide-react";
import { OrderStatusPoller } from "./order-status-poller";

export const metadata: Metadata = {
  title: "Your order — Monetized",
};

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

  const retryHref = order.items[0]
    ? `/${order.creatorProfile.username}/${order.items[0].product.slug}`
    : `/${order.creatorProfile.username}`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-12">
      {order.status === "PENDING" && <OrderStatusPoller />}

      <Card>
        <CardHeader className="items-center text-center">
          {order.status === "PAID" && <CheckCircle2 className="size-10 text-emerald-600" />}
          {order.status === "PENDING" && <Clock className="size-10 text-muted-foreground" />}
          {order.status === "FAILED" && <XCircle className="size-10 text-destructive" />}

          <CardTitle>
            {order.status === "PAID" && "Thank you for your purchase!"}
            {order.status === "PENDING" && "Confirming your payment…"}
            {order.status === "FAILED" && "Payment didn't go through"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Order {order.orderNumber}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{item.titleSnapshot}</span>
              <span className="text-sm text-muted-foreground">
                {formatMoney(item.priceAmountMinorSnapshot, order.currency)}
              </span>
            </div>
          ))}

          {order.discountAmountMinor > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Coupon {order.coupon?.code}</span>
                <span>-{formatMoney(order.discountAmountMinor, order.currency)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatMoney(order.totalAmountMinor, order.currency)}</span>
              </div>
            </div>
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
                {order.booking.startsAt.toLocaleString(undefined, {
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
      </Card>
    </div>
  );
}
