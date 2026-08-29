import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { getProductRevenueTotals, topProductRevenues } from "@/lib/order-item-revenue";
import { BarChart } from "@/components/dashboard/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Analytics — Monetized",
};

const DAYS_BACK = 14;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export default async function AnalyticsPage() {
  const user = await requireOnboardedCreator();
  const creatorProfileId = user.creatorProfile.id;
  const currency = user.creatorProfile.plan.currency;

  const since = new Date();
  since.setDate(since.getDate() - (DAYS_BACK - 1));
  since.setHours(0, 0, 0, 0);

  const [paidOrders, eventCounts, revenueTotals] = await Promise.all([
    db.order.findMany({
      where: { creatorProfileId, status: "PAID", createdAt: { gte: since } },
      select: { createdAt: true, totalAmountMinor: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["type"],
      where: { creatorProfileId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    getProductRevenueTotals(creatorProfileId),
  ]);
  const topItems = topProductRevenues(revenueTotals, 5);

  const revenueByDay = new Map<string, number>();
  for (let i = 0; i < DAYS_BACK; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    revenueByDay.set(dayKey(d), 0);
  }
  for (const order of paidOrders) {
    const key = dayKey(order.createdAt);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.totalAmountMinor);
  }
  const revenueData = Array.from(revenueByDay.entries()).map(([key, value]) => ({
    label: dayLabel(new Date(key)),
    value,
  }));

  const eventCountByType = Object.fromEntries(
    eventCounts.map((e) => [e.type, e._count._all]),
  ) as Record<string, number>;
  const storeViews = eventCountByType.STORE_VIEW ?? 0;
  const productViews = eventCountByType.PRODUCT_VIEW ?? 0;
  const checkoutStarted = eventCountByType.CHECKOUT_STARTED ?? 0;
  const ordersCompleted = eventCountByType.ORDER_COMPLETED ?? 0;
  const conversionRate = storeViews > 0 ? (ordersCompleted / storeViews) * 100 : 0;

  const productIds = topItems.map((item) => item.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });
  const productTitleById = new Map(products.map((p) => [p.id, p.title]));
  const topProductsData = topItems.map((item) => ({
    label: productTitleById.get(item.productId) ?? "Unknown",
    value: item.totalMinor,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last {DAYS_BACK} days.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FunnelStat label="Store views" value={storeViews} />
        <FunnelStat label="Product views" value={productViews} />
        <FunnelStat label="Checkouts started" value={checkoutStarted} />
        <FunnelStat label="Conversion rate" value={`${conversionRate.toFixed(1)}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={revenueData} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top products</CardTitle>
        </CardHeader>
        <CardContent>
          {topProductsData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <BarChart data={topProductsData} currency={currency} showValueLabels />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
