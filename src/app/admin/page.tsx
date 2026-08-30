import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/dashboard/charts/bar-chart";
import {
  getMrrBreakdown,
  getPlatformPlanRevenue,
  getRefundStats,
  getRevenueTrend,
  getTopCreatorsByRevenue,
} from "@/lib/admin-analytics";

export const metadata: Metadata = {
  title: "Admin overview — Monetized",
};

export default async function AdminOverviewPage() {
  const [
    creatorCount,
    paidOrders,
    planCounts,
    revenueTrend,
    mrr,
    refundStats,
    topCreators,
    platformPlanRevenue,
  ] = await Promise.all([
    db.creatorProfile.count(),
    db.order.findMany({
      where: { status: "PAID" },
      select: { totalAmountMinor: true, platformFeeAmountMinor: true, currency: true },
    }),
    db.creatorProfile.groupBy({ by: ["planId"], _count: { _all: true } }),
    getRevenueTrend(),
    getMrrBreakdown(),
    getRefundStats(),
    getTopCreatorsByRevenue(5),
    getPlatformPlanRevenue(),
  ]);

  const plans = await db.plan.findMany({ select: { id: true, name: true } });
  const planNameById = new Map(plans.map((p) => [p.id, p.name]));

  const gmvMinor = paidOrders.reduce((sum, o) => sum + o.totalAmountMinor, 0);
  const transactionFeeRevenueMinor = paidOrders.reduce((sum, o) => sum + o.platformFeeAmountMinor, 0);
  const currency = paidOrders[0]?.currency ?? "INR";
  const totalPlatformRevenueMinor = transactionFeeRevenueMinor + platformPlanRevenue.cumulativeAmountMinor;
  const averageOrderValueMinor = paidOrders.length > 0 ? Math.round(gmvMinor / paidOrders.length) : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Creators" value={String(creatorCount)} />
        <StatCard label="Paid orders" value={String(paidOrders.length)} />
        <StatCard label="Gross volume" value={formatMoney(gmvMinor, currency)} />
        <StatCard label="Platform revenue" value={formatMoney(totalPlatformRevenueMinor, currency)} />
        <StatCard
          label="MRR"
          value={formatMoney(mrr.totalMrrMinor, currency)}
          hint={`${formatMoney(mrr.buyerMrrMinor, currency)} buyer subs + ${formatMoney(mrr.platformMrrMinor, currency)} plans`}
        />
        <StatCard label="Average order value" value={formatMoney(averageOrderValueMinor, currency)} />
        <StatCard
          label="Refund rate"
          value={`${refundStats.refundRatePercent.toFixed(1)}%`}
          hint={`${refundStats.refundedCount} orders, ${formatMoney(refundStats.refundedAmountMinor, currency)}`}
        />
        <StatCard
          label="Paying creators"
          value={String(platformPlanRevenue.payingCreatorCount)}
          hint={`${formatMoney(platformPlanRevenue.cumulativeAmountMinor, currency)} all-time from plans`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gross volume — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={revenueTrend} currency={currency} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-sm font-medium">Creators by plan</p>
            <div className="flex flex-col gap-2">
              {planCounts.map((row) => (
                <div key={row.planId} className="flex items-center justify-between text-sm">
                  <span>{planNameById.get(row.planId) ?? "Unknown"}</span>
                  <span className="text-muted-foreground">{row._count._all}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-sm font-medium">Top creators by revenue</p>
            {topCreators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid orders yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topCreators.map((creator) => (
                  <Link
                    key={creator.creatorProfileId}
                    href="/admin/creators"
                    className="flex items-center justify-between text-sm hover:underline"
                  >
                    <span>
                      {creator.displayName} <span className="text-muted-foreground">@{creator.username}</span>
                    </span>
                    <span className="tabular-nums">{formatMoney(creator.revenueMinor, currency)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
