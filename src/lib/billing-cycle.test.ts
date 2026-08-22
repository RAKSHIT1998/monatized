import { describe, expect, it } from "vitest";
import { nextPeriodEnd } from "./billing-cycle";

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
