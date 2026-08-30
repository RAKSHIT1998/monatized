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
