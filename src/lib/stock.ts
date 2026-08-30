// Deliberately no "server-only" guard — every DB-touching function here
// takes its Prisma client as an argument rather than importing `db`
// directly, and isProductSoldOut is pure, so this stays unit-testable
// (same reasoning as coupons.ts/growth-insights.ts).
import type { PrismaClient, Prisma } from "@/generated/prisma/client";

// Which row actually owns the stock count for a given order line — the
// Product itself when it has no variants (the original, still-default
// case), or the matching ProductVariant once a product has any. Callers
// resolve this once per line; every stock operation below just acts on it.
export type StockTarget = { kind: "product"; id: string } | { kind: "variant"; id: string };

// Same guarded-decrement shape used for a single-item PHYSICAL checkout
// since before variants existed, generalized to target either row. Must run
// inside the same transaction as the order/order-item creation so a losing
// race never leaves a paid-for order with no stock reserved.
export async function decrementStockGuarded(
  tx: Prisma.TransactionClient,
  target: StockTarget,
  quantity: number,
): Promise<boolean> {
  const result =
    target.kind === "variant"
      ? await tx.productVariant.updateMany({
          where: { id: target.id, stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        })
      : await tx.product.updateMany({
          where: { id: target.id, stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        });
  return result.count > 0;
}

// Returns the (un-awaited) Prisma operation so callers can spread it into an
// array-form `$transaction([...])`, matching markOrderFailed's existing
// shape — never awaited here, since the caller decides how it's composed.
export function restoreStock(
  db: Pick<PrismaClient, "product" | "productVariant">,
  target: StockTarget,
  quantity: number,
) {
  return target.kind === "variant"
    ? db.productVariant.update({ where: { id: target.id }, data: { stockQuantity: { increment: quantity } } })
    : db.product.update({ where: { id: target.id }, data: { stockQuantity: { increment: quantity } } });
}

// Pure — no DB access, safe to call from a Server Component that already
// has the product + variants in hand.
export function isProductSoldOut(product: {
  stockQuantity: number | null;
  variants: { stockQuantity: number | null }[];
}): boolean {
  if (product.variants.length > 0) {
    return product.variants.every((v) => v.stockQuantity !== null && v.stockQuantity <= 0);
  }
  return product.stockQuantity !== null && product.stockQuantity <= 0;
}
