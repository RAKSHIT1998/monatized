import "server-only";
import { db } from "@/lib/db";
import { monthlyEquivalent } from "@/lib/billing-cycle";
import type { BarChartDatum } from "@/components/dashboard/charts/bar-chart";

const REVENUE_TREND_DAYS = 30;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** Daily GMV for the last 30 days, bucketed the same way the creator-facing analytics page does. */
export async function getRevenueTrend(): Promise<BarChartDatum[]> {
  const since = new Date();
  since.setDate(since.getDate() - (REVENUE_TREND_DAYS - 1));
  since.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: { status: "PAID", createdAt: { gte: since } },
    select: { createdAt: true, totalAmountMinor: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 0; i < REVENUE_TREND_DAYS; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay.set(dayKey(d), 0);
  }
  for (const order of orders) {
    const key = dayKey(order.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + order.totalAmountMinor);
  }

  return Array.from(byDay.entries()).map(([key, value]) => ({ label: dayLabel(new Date(key)), value }));
}

export type MrrBreakdown = {
  buyerMrrMinor: number;
  platformMrrMinor: number;
  totalMrrMinor: number;
};

/** MRR from two distinct revenue streams: buyers subscribing to a creator's product, and creators paying for their own platform plan. */
export async function getMrrBreakdown(): Promise<MrrBreakdown> {
  const [buyerSubs, platformSubs] = await Promise.all([
    db.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { unitAmountMinor: true, billingInterval: true },
    }),
    db.platformSubscription.findMany({
      where: { status: "ACTIVE" },
      select: { unitAmountMinor: true },
    }),
  ]);

  const buyerMrrMinor = buyerSubs.reduce(
    (sum, s) => sum + monthlyEquivalent(s.unitAmountMinor, s.billingInterval),
    0,
  );
  const platformMrrMinor = platformSubs.reduce((sum, s) => sum + s.unitAmountMinor, 0);

  return { buyerMrrMinor, platformMrrMinor, totalMrrMinor: buyerMrrMinor + platformMrrMinor };
}

export type RefundStats = {
  refundedCount: number;
  refundedAmountMinor: number;
  refundRatePercent: number;
};

/** Refund rate is refunded ÷ (paid + refunded) — the universe of orders that were ever actually paid. */
export async function getRefundStats(): Promise<RefundStats> {
  const [paidCount, refundedOrders] = await Promise.all([
    db.order.count({ where: { status: "PAID" } }),
    db.order.findMany({ where: { status: "REFUNDED" }, select: { totalAmountMinor: true } }),
  ]);

  const refundedCount = refundedOrders.length;
  const refundedAmountMinor = refundedOrders.reduce((sum, o) => sum + o.totalAmountMinor, 0);
  const everPaidCount = paidCount + refundedCount;
  const refundRatePercent = everPaidCount > 0 ? (refundedCount / everPaidCount) * 100 : 0;

  return { refundedCount, refundedAmountMinor, refundRatePercent };
}

export type TopCreator = { creatorProfileId: string; displayName: string; username: string; revenueMinor: number };

export async function getTopCreatorsByRevenue(take = 5): Promise<TopCreator[]> {
  const grouped = await db.order.groupBy({
    by: ["creatorProfileId"],
    where: { status: "PAID" },
    _sum: { totalAmountMinor: true },
    orderBy: { _sum: { totalAmountMinor: "desc" } },
    take,
  });

  const creators = await db.creatorProfile.findMany({
    where: { id: { in: grouped.map((g) => g.creatorProfileId) } },
    select: { id: true, displayName: true, username: true },
  });
  const byId = new Map(creators.map((c) => [c.id, c]));

  return grouped
    .map((g) => {
      const creator = byId.get(g.creatorProfileId);
      if (!creator) return null;
      return {
        creatorProfileId: g.creatorProfileId,
        displayName: creator.displayName,
        username: creator.username,
        revenueMinor: g._sum.totalAmountMinor ?? 0,
      };
    })
    .filter((c): c is TopCreator => c !== null);
}

export type PlatformPlanRevenue = { cumulativeAmountMinor: number; payingCreatorCount: number };

/** All-time revenue actually collected from creators paying for their own plan — distinct from the current-MRR snapshot above. */
export async function getPlatformPlanRevenue(): Promise<PlatformPlanRevenue> {
  const [payments, payingCreatorCount] = await Promise.all([
    db.platformPayment.findMany({ select: { amountMinor: true } }),
    db.platformSubscription.count({ where: { status: { in: ["ACTIVE", "PAST_DUE"] } } }),
  ]);

  return {
    cumulativeAmountMinor: payments.reduce((sum, p) => sum + p.amountMinor, 0),
    payingCreatorCount,
  };
}
