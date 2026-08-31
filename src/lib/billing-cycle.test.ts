import { describe, expect, it } from "vitest";
import { computeProrationCredit, monthlyEquivalent, nextPeriodEnd } from "./billing-cycle";

describe("nextPeriodEnd", () => {
  it("adds one month", () => {
    const result = nextPeriodEnd(new Date("2026-03-15T00:00:00.000Z"), "MONTHLY");
    expect(result.toISOString().slice(0, 10)).toBe("2026-04-15");
  });

  it("adds one year", () => {
    const result = nextPeriodEnd(new Date("2026-03-15T00:00:00.000Z"), "YEARLY");
    expect(result.toISOString().slice(0, 10)).toBe("2027-03-15");
  });

  it("rolls over correctly when the month has fewer days (Jan 31 -> Mar 3)", () => {
    // JS Date arithmetic overflows rather than clamping — this documents that
    // behavior so a subscriber billed on the 31st doesn't silently land on a
    // date nobody checked.
    const result = nextPeriodEnd(new Date("2026-01-31T00:00:00.000Z"), "MONTHLY");
    expect(result.toISOString().slice(0, 10)).toBe("2026-03-03");
  });

  it("handles a leap-year February correctly", () => {
    const result = nextPeriodEnd(new Date("2028-01-29T00:00:00.000Z"), "MONTHLY");
    expect(result.toISOString().slice(0, 10)).toBe("2028-02-29");
  });
});

describe("monthlyEquivalent", () => {
  it("returns a monthly amount unchanged", () => {
    expect(monthlyEquivalent(150000, "MONTHLY")).toBe(150000);
  });

  it("divides a yearly amount by 12", () => {
    expect(monthlyEquivalent(120000, "YEARLY")).toBe(10000);
  });

  it("rounds a yearly amount that doesn't divide evenly", () => {
    expect(monthlyEquivalent(100000, "YEARLY")).toBe(8333);
  });
});

describe("computeProrationCredit", () => {
  // September has 30 days, so periodStart -> currentPeriodEnd is exactly 30
  // days — clean boundaries make the fraction math exact, not approximate.
  const currentPeriodEnd = new Date("2026-10-01T00:00:00.000Z");
  const periodStart = new Date("2026-09-01T00:00:00.000Z");

  it("credits the full amount at the very start of the period", () => {
    expect(computeProrationCredit(100000, currentPeriodEnd, periodStart)).toBe(100000);
  });

  it("credits half the amount exactly halfway through", () => {
    const halfway = new Date("2026-09-16T00:00:00.000Z"); // 15 of 30 days remaining
    expect(computeProrationCredit(100000, currentPeriodEnd, halfway)).toBe(50000);
  });

  it("credits nothing right at period end", () => {
    expect(computeProrationCredit(100000, currentPeriodEnd, currentPeriodEnd)).toBe(0);
  });

  it("clamps to zero once the period has already elapsed", () => {
    const afterEnd = new Date("2026-10-15T00:00:00.000Z");
    expect(computeProrationCredit(100000, currentPeriodEnd, afterEnd)).toBe(0);
  });
});
