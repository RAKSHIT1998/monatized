import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { computeGrowthInsights } from "@/lib/growth-insights";
import { getProductRevenueTotals } from "@/lib/order-item-revenue";
import { hasFeatureAccess, featureLabel, minPlanFor, planDisplayName } from "@/lib/plan-features";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { DescriptionGenerator } from "./description-generator";

export const metadata: Metadata = {
  title: "Growth engine — Monetized",
};

// Shown inside the locked preview. These mirror the shapes
// computeGrowthInsights actually produces, so the preview is an honest
// picture of the feature rather than an idealised one.
const SAMPLE_INSIGHTS = [
  {
    title: "12 checkouts started, 7 finished",
    detail: "Five buyers dropped off at payment in the last 30 days — worth a look at your pricing or checkout copy.",
    warning: true,
  },
  {
    title: "2 subscribers are past due",
    detail: "Their last payment failed. They keep access until you cancel, so a nudge usually recovers them.",
    warning: true,
  },
  {
    title: "\"Lightroom Presets\" earns the most",
    detail: "It brings in 46% of your revenue. Consider a bundle or a follow-up pack around it.",
    warning: false,
  },
];

export default async function GrowthPage() {
  const user = await requireOnboardedCreator();
  const creatorProfileId = user.creatorProfile.id;

  if (!hasFeatureAccess(user.creatorProfile.plan.key, "GROWTH_ENGINE")) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Growth engine</h1>
          <p className="text-muted-foreground text-sm">
            Rule-based insights from your own numbers — not generated, computed. Plus an
            AI-assisted product description writer.
          </p>
        </div>
        <FeaturePreview
          feature={featureLabel("GROWTH_ENGINE")}
          minPlanName={planDisplayName(minPlanFor("GROWTH_ENGINE"))}
          summary="Tells you what to fix next, worked out from your own sales rather than generic advice."
          benefits={[
            "Spot checkouts that start but never finish",
            "Catch subscribers whose payment quietly failed",
            "Draft product descriptions without staring at a blank box",
          ]}
        >
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {SAMPLE_INSIGHTS.map((insight) => (
                  <div key={insight.title} className="flex gap-3 rounded-lg border p-3">
                    <Lightbulb className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{insight.title}</p>
                        {insight.warning && <Badge variant="destructive">Attention</Badge>}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-sm">{insight.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </FeaturePreview>
      </div>
    );
  }

  const [revenueTotals, pastDueSubscriberCount, eventCounts, activeCouponCount, customers, products] =
    await Promise.all([
      getProductRevenueTotals(creatorProfileId),
      db.subscription.count({ where: { creatorProfileId, status: "PAST_DUE" } }),
      db.analyticsEvent.groupBy({
        by: ["type"],
        where: { creatorProfileId },
        _count: { _all: true },
      }),
      db.coupon.count({ where: { creatorProfileId, isActive: true } }),
      db.customer.findMany({ where: { creatorProfileId }, select: { ordersCount: true } }),
      db.product.findMany({
        where: { creatorProfileId },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const titleById = new Map(products.map((p) => [p.id, p.title]));

  const eventCountByType = Object.fromEntries(
    eventCounts.map((e) => [e.type, e._count._all]),
  ) as Record<string, number>;

  const insights = computeGrowthInsights({
    productRevenues: [...revenueTotals.entries()].map(([productId, totalMinor]) => ({
      title: titleById.get(productId) ?? "Unknown",
      totalMinor,
    })),
    productCount: products.length,
    pastDueSubscriberCount,
    checkoutStartedCount: eventCountByType.CHECKOUT_STARTED ?? 0,
    orderCompletedCount: eventCountByType.ORDER_COMPLETED ?? 0,
    activeCouponCount,
    repeatCustomerCount: customers.filter((c) => c.ordersCount > 1).length,
    totalCustomerCount: customers.length,
  });

  const aiProviderLabel = process.env.AI_PROVIDER === "anthropic" ? "Claude" : "built-in templates (no AI key set)";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Growth engine</h1>
        <p className="text-sm text-muted-foreground">
          Rule-based insights from your own numbers — not generated, computed. Plus an AI-assisted
          product description writer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing stands out right now — check back as you get more sales.
            </p>
          ) : (
            insights.map((insight) => (
              <div key={insight.id} className="flex gap-3 rounded-lg border p-3">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{insight.title}</p>
                    {insight.severity === "warning" && <Badge variant="destructive">Attention</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{insight.detail}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <DescriptionGenerator products={products} aiProviderLabel={aiProviderLabel} />
    </div>
  );
}
