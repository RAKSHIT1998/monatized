import { describe, expect, it } from "vitest";
import { calculateDiscountMinor } from "./coupons";

describe("calculateDiscountMinor", () => {
  it("computes a percent discount", () => {
    expect(calculateDiscountMinor(10000, { discountType: "PERCENT", discountValue: 20 })).toBe(
      2000,
    );
  });

  it("computes a fixed discount", () => {
    expect(calculateDiscountMinor(10000, { discountType: "FIXED", discountValue: 1500 })).toBe(
      1500,
    );
  });

  it("never discounts below zero on the order", () => {
    expect(calculateDiscountMinor(0, { discountType: "FIXED", discountValue: 500 })).toBe(0);
  });

  it("caps a fixed discount at the subtotal so the order never goes negative", () => {
    expect(calculateDiscountMinor(1000, { discountType: "FIXED", discountValue: 5000 })).toBe(
      1000,
    );
  });

  it("rounds a percent discount to the nearest minor unit", () => {
    expect(calculateDiscountMinor(999, { discountType: "PERCENT", discountValue: 33 })).toBe(330);
  });
});
