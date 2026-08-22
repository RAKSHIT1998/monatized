import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin overview — Monetized",
};

export default async function AdminOverviewPage() {
  const [creatorCount, paidOrders, planCounts] = await Promise.all([
    db.creatorProfile.count(),
    db.order.findMany({
      where: { status: "PAID" },
      select: { totalAmountMinor: true, platformFeeAmountMinor: true, currency: true },
    }),
    db.creatorProfile.groupBy({ by: ["planId"], _count: { _all: true } }),
  ]);

  const plans = await db.plan.findMany({ select: { id: true, name: true } });
  const planNameById = new Map(plans.map((p) => [p.id, p.name]));

  const gmvMinor = paidOrders.reduce((sum, o) => sum + o.totalAmountMinor, 0);
  const platformRevenueMinor = paidOrders.reduce((sum, o) => sum + o.platformFeeAmountMinor, 0);
  const currency = paidOrders[0]?.currency ?? "INR";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Creators" value={String(creatorCount)} />
        <StatCard label="Paid orders" value={String(paidOrders.length)} />
        <StatCard label="Gross volume" value={formatMoney(gmvMinor, currency)} />
        <StatCard label="Platform revenue" value={formatMoney(platformRevenueMinor, currency)} />
      </div>

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
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
