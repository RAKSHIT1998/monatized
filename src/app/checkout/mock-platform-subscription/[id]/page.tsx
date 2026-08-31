import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { MockPlatformSubscriptionActions } from "./mock-platform-subscription-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Test plan checkout — Monetized",
};

export default async function MockPlatformSubscriptionCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subscription = await db.platformSubscription.findUnique({
    where: { id },
    include: { plan: true },
  });

  if (!subscription || subscription.provider !== "MOCK" || subscription.status !== "INCOMPLETE") {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Test plan checkout</CardTitle>
          <CardDescription>
            No real payment provider is configured — simulate the outcome below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{subscription.plan.name} plan</p>
            <p className="text-lg font-semibold">
              {formatMoney(subscription.unitAmountMinor, subscription.currency)}
              <span className="text-sm font-normal text-muted-foreground"> / month</span>
            </p>
            {subscription.pendingChargeMinor !== null && (
              <div className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Credit for unused time on your current plan</span>
                  <span>
                    -{formatMoney(
                      subscription.unitAmountMinor - subscription.pendingChargeMinor,
                      subscription.currency,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Due today</span>
                  <span>{formatMoney(subscription.pendingChargeMinor, subscription.currency)}</span>
                </div>
              </div>
            )}
          </div>
          <MockPlatformSubscriptionActions platformSubscriptionId={subscription.id} />
        </CardContent>
      </Card>
    </div>
  );
}
