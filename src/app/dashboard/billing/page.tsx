import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CancelPlanButton, DowngradeButton, PlatformSimulateControls, UpgradeButton } from "./billing-actions";

export const metadata: Metadata = {
  title: "Billing — Monetized",
};

export default async function BillingPage() {
  const user = await requireOnboardedCreator();
  const creatorProfileId = user.creatorProfile.id;

  const [plans, productCount, platformSubscription] = await Promise.all([
    db.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyMinor: "asc" } }),
    db.product.count({ where: { creatorProfileId } }),
    db.platformSubscription.findUnique({ where: { creatorProfileId }, include: { plan: true } }),
  ]);

  const currentPlanId = user.creatorProfile.plan.id;
  const hasLivePaidSubscription = platformSubscription && platformSubscription.status !== "CANCELLED";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Your plan and usage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {user.creatorProfile.plan.productLimit === null
              ? `${productCount} products — unlimited`
              : `${productCount} of ${user.creatorProfile.plan.productLimit} products used`}
          </CardDescription>
        </CardHeader>
        {hasLivePaidSubscription && (
          <CardContent className="flex flex-col gap-3">
            {platformSubscription.status === "PAST_DUE" && (
              <p className="text-sm text-destructive">
                Your last payment for {platformSubscription.plan.name} failed. Update your payment
                method to keep your plan.
              </p>
            )}
            {platformSubscription.status === "ACTIVE" && platformSubscription.cancelAtPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Your {platformSubscription.plan.name} plan ends on{" "}
                {platformSubscription.currentPeriodEnd?.toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}{" "}
                — you&apos;ll move to Free after that.
              </p>
            )}
            {platformSubscription.status === "ACTIVE" && !platformSubscription.cancelAtPeriodEnd && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Renews{" "}
                  {platformSubscription.currentPeriodEnd?.toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}{" "}
                  — {formatMoney(platformSubscription.unitAmountMinor, platformSubscription.currency)}/mo
                </p>
                <CancelPlanButton />
              </div>
            )}
            {platformSubscription.provider === "MOCK" && platformSubscription.status !== "CANCELLED" && (
              <PlatformSimulateControls />
            )}
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isFree = plan.priceMonthlyMinor === 0;
          const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
          return (
            <Card key={plan.id} className={cn(isCurrent && "ring-2 ring-primary")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <CardDescription>
                  {isFree ? "Free" : `${formatMoney(plan.priceMonthlyMinor, plan.currency)}/mo`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    {feature}
                  </div>
                ))}
                {!isCurrent &&
                  (isFree ? <DowngradeButton /> : <UpgradeButton planId={plan.id} planName={plan.name} />)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
