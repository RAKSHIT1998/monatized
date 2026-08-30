"use server";

import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";

export type RecentSale = {
  id: string;
  productTitle: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
};

// Polled from the dashboard shell — real orders that actually landed since
// the given timestamp, never simulated. "Live" here means "polling", not a
// websocket/SSE push — honest about the mechanism, not just the data.
export async function getRecentPaidOrdersSince(sinceIso: string): Promise<RecentSale[]> {
  const user = await requireOnboardedCreator();
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return [];

  const orders = await db.order.findMany({
    where: {
      creatorProfileId: user.creatorProfile.id,
      status: "PAID",
      updatedAt: { gt: since },
    },
    orderBy: { updatedAt: "asc" },
    take: 20,
    select: {
      id: true,
      totalAmountMinor: true,
      currency: true,
      customer: { select: { email: true } },
      items: { select: { titleSnapshot: true, variantLabel: true }, orderBy: { id: "asc" }, take: 1 },
      _count: { select: { items: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    productTitle:
      (order.items[0]?.titleSnapshot ?? "a product") +
      (order.items[0]?.variantLabel ? ` — ${order.items[0].variantLabel}` : "") +
      (order._count.items > 1 ? ` + ${order._count.items - 1} more` : ""),
    amountMinor: order.totalAmountMinor,
    currency: order.currency,
    customerEmail: order.customer.email,
  }));
}
