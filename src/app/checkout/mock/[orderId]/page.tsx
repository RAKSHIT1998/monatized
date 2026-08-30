import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { MockPaymentActions } from "./mock-payment-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Test payment — Monetized",
};

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payment: true, items: { orderBy: { id: "asc" } } },
  });

  if (!order || order.payment?.provider !== "MOCK" || order.status !== "PENDING") {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Test payment</CardTitle>
          <CardDescription>
            No real payment provider is configured — simulate the outcome below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">
              {order.items[0]?.titleSnapshot}
              {order.items[0]?.variantLabel && ` — ${order.items[0].variantLabel}`}
              {order.items.length > 1 && ` + ${order.items.length - 1} more`}
            </p>
            <p className="text-lg font-semibold">
              {formatMoney(order.totalAmountMinor, order.currency)}
            </p>
          </div>
          <MockPaymentActions orderId={order.id} />
        </CardContent>
      </Card>
    </div>
  );
}
