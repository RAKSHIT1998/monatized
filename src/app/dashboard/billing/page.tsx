import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Billing — Monetized",
};

export default async function BillingPage() {
  const user = await requireOnboardedCreator();
  const creatorProfileId = user.creatorProfile.id;

  const [plans, productCount] = await Promise.all([
    db.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyMinor: "asc" } }),
    db.product.count({ where: { creatorProfileId } }),
  ]);

  const currentPlanId = user.creatorProfile.plan.id;

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
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
          return (
            <Card key={plan.id} className={cn(isCurrent && "ring-2 ring-primary")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <CardDescription>
                  {plan.priceMonthlyMinor === 0
                    ? "Free"
                    : `${formatMoney(plan.priceMonthlyMinor, plan.currency)}/mo`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    {feature}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
