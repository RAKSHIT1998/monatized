import "server-only";
import { db } from "@/lib/db";

// Prisma's groupBy/_sum can't aggregate a computed expression (quantity *
// priceAmountMinorSnapshot), so a single-item's line total was previously
// undercounted for any cart order with quantity > 1 — this fetches the raw
// rows and sums the real per-line total in JS instead.
export async function getProductRevenueTotals(creatorProfileId: string): Promise<Map<string, number>> {
  const items = await db.orderItem.findMany({
    where: { order: { creatorProfileId, status: "PAID" } },
    select: { productId: true, priceAmountMinorSnapshot: true, quantity: true },
  });

  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(
      item.productId,
      (totals.get(item.productId) ?? 0) + item.priceAmountMinorSnapshot * item.quantity,
    );
  }
  return totals;
}

export function topProductRevenues(totals: Map<string, number>, take: number): { productId: string; totalMinor: number }[] {
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([productId, totalMinor]) => ({ productId, totalMinor }));
}
