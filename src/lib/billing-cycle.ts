export function nextPeriodEnd(from: Date, interval: "MONTHLY" | "YEARLY"): Date {
  const next = new Date(from);
  if (interval === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);
  return next;
}

/** Normalizes a recurring amount to its monthly equivalent, for summing MRR across mixed billing intervals. */
export function monthlyEquivalent(amountMinor: number, interval: "MONTHLY" | "YEARLY"): number {
  return interval === "YEARLY" ? Math.round(amountMinor / 12) : amountMinor;
}

/**
 * Credit for the unused portion of a monthly plan, as of `now`. `periodStart`
 * isn't stored anywhere, so it's derived as the inverse of `nextPeriodEnd`
 * (one calendar month before `currentPeriodEnd`) — exact for a normal cycle,
 * since platform billing is always monthly.
 */
export function computeProrationCredit(unitAmountMinor: number, currentPeriodEnd: Date, now: Date): number {
  const periodStart = new Date(currentPeriodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);

  const totalMs = currentPeriodEnd.getTime() - periodStart.getTime();
  const remainingMs = currentPeriodEnd.getTime() - now.getTime();
  if (totalMs <= 0 || remainingMs <= 0) return 0;

  const fraction = Math.min(1, remainingMs / totalMs);
  return Math.round(unitAmountMinor * fraction);
}
