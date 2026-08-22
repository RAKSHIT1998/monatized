import { describe, expect, it } from "vitest";
import { formatMoney, toMinorUnits } from "./money";

describe("toMinorUnits", () => {
  it("converts rupees to paise", () => {
    expect(toMinorUnits(499)).toBe(49900);
    expect(toMinorUnits(4.99)).toBe(499);
  });

  it("rounds to the nearest minor unit", () => {
    expect(toMinorUnits(10.005)).toBe(1001); // avoids floating-point drift landing at 1000
  });

  it("handles zero", () => {
    expect(toMinorUnits(0)).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats whole-rupee amounts without decimals", () => {
    expect(formatMoney(49900, "INR")).toBe("₹499");
  });

  it("formats zero", () => {
    expect(formatMoney(0, "INR")).toBe("₹0");
  });
});
