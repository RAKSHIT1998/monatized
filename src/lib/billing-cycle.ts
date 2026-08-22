export function nextPeriodEnd(from: Date, interval: "MONTHLY" | "YEARLY"): Date {
  const next = new Date(from);
  if (interval === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);
  return next;
}
