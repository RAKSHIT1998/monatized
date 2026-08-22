import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { MockSubscriptionActions } from "./mock-subscription-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Test subscription — Monetized",
};

export default async function MockSubscriptionCheckoutPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const { subscriptionId } = await params;

  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { product: true },
  });

  if (!subscription || subscription.provider !== "MOCK" || subscription.status !== "INCOMPLETE") {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Test subscription</CardTitle>
          <CardDescription>
            No real payment provider is configured — simulate the outcome below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{subscription.product.title}</p>
            <p className="text-lg font-semibold">
              {formatMoney(subscription.unitAmountMinor, subscription.currency)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {subscription.billingInterval === "MONTHLY" ? "month" : "year"}
              </span>
            </p>
          </div>
          <MockSubscriptionActions subscriptionId={subscription.id} />
        </CardContent>
      </Card>
    </div>
  );
}
