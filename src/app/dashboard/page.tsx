import Link from "next/link";
import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import { Sparkline, type SparklineFormat } from "@/components/dashboard/charts/sparkline";
import { FirstSaleCelebration } from "./first-sale-celebration";

const TREND_DAYS = 14;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDelta(current: number, previous: number) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return pct;
}

export const metadata: Metadata = {
  title: "Dashboard — Monetized",
};

export default async function DashboardOverviewPage() {
  const user = await requireOnboardedCreator();
  const creatorProfileId = user.creatorProfile.id;

  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - TREND_DAYS * 2);
  previousPeriodStart.setHours(0, 0, 0, 0);
  const currentPeriodStart = new Date();
  currentPeriodStart.setDate(currentPeriodStart.getDate() - (TREND_DAYS - 1));
  currentPeriodStart.setHours(0, 0, 0, 0);

  const [productsCount, paidOrdersCount, customersCount, revenue, recentOrders] = await Promise.all([
    db.product.count({ where: { creatorProfileId } }),
    db.order.count({ where: { creatorProfileId, status: "PAID" } }),
    db.customer.count({ where: { creatorProfileId } }),
    db.order.aggregate({
      where: { creatorProfileId, status: "PAID" },
      _sum: { totalAmountMinor: true },
    }),
    db.order.findMany({
      where: { creatorProfileId, status: "PAID", createdAt: { gte: previousPeriodStart } },
      select: { createdAt: true, totalAmountMinor: true },
    }),
  ]);

  const currency = user.creatorProfile.plan.currency;
  const totalRevenueMinor = revenue._sum.totalAmountMinor ?? 0;

  // 14-day sparkline + a signed delta vs the 14 days before that — the
  // "trend" and "delta" the dataviz skill's stat-tile contract calls for.
  const revenueByDay = new Map<string, number>();
  const ordersByDay = new Map<string, number>();
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date(currentPeriodStart);
    d.setDate(d.getDate() + i);
    revenueByDay.set(dayKey(d), 0);
    ordersByDay.set(dayKey(d), 0);
  }
  let currentRevenueMinor = 0;
  let previousRevenueMinor = 0;
  let currentOrdersCount = 0;
  let previousOrdersCount = 0;
  for (const order of recentOrders) {
    if (order.createdAt >= currentPeriodStart) {
      currentRevenueMinor += order.totalAmountMinor;
      currentOrdersCount += 1;
      const key = dayKey(order.createdAt);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.totalAmountMinor);
      ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
    } else {
      previousRevenueMinor += order.totalAmountMinor;
      previousOrdersCount += 1;
    }
  }
  const revenueTrend = Array.from(revenueByDay.entries()).map(([key, value]) => ({
    label: dayLabel(new Date(key)),
    value,
  }));
  const ordersTrend = Array.from(ordersByDay.entries()).map(([key, value]) => ({
    label: dayLabel(new Date(key)),
    value,
  }));
  const revenueDeltaPct = formatDelta(currentRevenueMinor, previousRevenueMinor);
  const ordersDeltaPct = formatDelta(currentOrdersCount, previousOrdersCount);

  const checklist = [
    { done: productsCount > 0, label: "Add your first product", href: "/dashboard/products/new" },
    { done: false, label: "Customize your storefront", href: "/dashboard/store" },
    { done: paidOrdersCount > 0, label: "Make your first sale", href: `/${user.creatorProfile.username}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s how {user.creatorProfile.displayName}&apos;s store is doing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatMoney(totalRevenueMinor, currency)}
          deltaPct={revenueDeltaPct}
          trend={revenueTrend}
          trendFormat={{ type: "money", currency }}
        />
        <StatCard
          label="Orders"
          value={String(paidOrdersCount)}
          deltaPct={ordersDeltaPct}
          trend={ordersTrend}
          trendFormat={{ type: "count" }}
        />
        <StatCard label="Products" value={String(productsCount)} />
        <StatCard label="Customers" value={String(customersCount)} />
      </div>

      <FirstSaleCelebration hasFirstSale={paidOrdersCount === 1} />

      {checklist.some((item) => !item.done) && (
        <Card>
          <CardHeader>
            <CardTitle>Get your store ready</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {checklist.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2.5 rounded-md p-2 text-sm hover:bg-muted"
              >
                {item.done ? (
                  <CheckCircle2 className="size-4 text-foreground" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={item.done ? "text-muted-foreground line-through" : ""}>
                  {item.label}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {productsCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add your first product</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Sell a PDF, template, preset, or any downloadable file directly from your store.
            </p>
            <Link
              href="/dashboard/products/new"
              className={cn(buttonVariants(), "w-fit")}
            >
              Create a product
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  deltaPct,
  trend,
  trendFormat,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  trend?: { label: string; value: number }[];
  trendFormat?: SparklineFormat;
}) {
  return (
    <Card>
      <CardContent className="flex items-end justify-between gap-3 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {deltaPct !== undefined && deltaPct !== null && (
            <p
              className={cn(
                "mt-0.5 text-xs font-medium",
                deltaPct >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive",
              )}
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(0)}% vs prior 14 days
            </p>
          )}
        </div>
        {trend && trendFormat && <Sparkline data={trend} format={trendFormat} />}
      </CardContent>
    </Card>
  );
}
