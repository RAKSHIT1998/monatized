import { describe, expect, it } from "vitest";
import { computeGrowthInsights } from "./growth-insights";

const baseInput = {
  productRevenues: [] as { title: string; totalMinor: number }[],
  productCount: 0,
  pastDueSubscriberCount: 0,
  checkoutStartedCount: 0,
  orderCompletedCount: 0,
  activeCouponCount: 1,
  repeatCustomerCount: 0,
  totalCustomerCount: 0,
};

describe("computeGrowthInsights", () => {
  it("flags revenue concentration when one product dominates", () => {
    const insights = computeGrowthInsights({
      ...baseInput,
      productRevenues: [
        { title: "Big Course", totalMinor: 90_00 },
        { title: "Small Ebook", totalMinor: 10_00 },
      ],
    });
    expect(insights.some((i) => i.id === "revenue-concentration")).toBe(true);
  });

  it("does not flag concentration with only one product", () => {
    const insights = computeGrowthInsights({
      ...baseInput,
      productRevenues: [{ title: "Only Product", totalMinor: 100_00 }],
    });
    expect(insights.some((i) => i.id === "revenue-concentration")).toBe(false);
  });

  it("flags past-due subscribers", () => {
    const insights = computeGrowthInsights({ ...baseInput, pastDueSubscriberCount: 2 });
    expect(insights.some((i) => i.id === "past-due-subscribers")).toBe(true);
  });

  it("flags low conversion only with enough sample size", () => {
    const tooFewSamples = computeGrowthInsights({
      ...baseInput,
      checkoutStartedCount: 3,
      orderCompletedCount: 0,
    });
    expect(tooFewSamples.some((i) => i.id === "low-conversion")).toBe(false);

    const enoughSamples = computeGrowthInsights({
      ...baseInput,
      checkoutStartedCount: 10,
      orderCompletedCount: 1,
    });
    expect(enoughSamples.some((i) => i.id === "low-conversion")).toBe(true);
  });

  it("suggests a coupon when none are active and products exist (even with no sales yet)", () => {
    const insights = computeGrowthInsights({
      ...baseInput,
      activeCouponCount: 0,
      productCount: 1,
    });
    expect(insights.some((i) => i.id === "no-coupons")).toBe(true);
  });

  it("does not suggest a coupon when the store has no products at all", () => {
    const insights = computeGrowthInsights({ ...baseInput, activeCouponCount: 0, productCount: 0 });
    expect(insights.some((i) => i.id === "no-coupons")).toBe(false);
  });

  it("flags a strong repeat-customer rate", () => {
    const insights = computeGrowthInsights({
      ...baseInput,
      totalCustomerCount: 10,
      repeatCustomerCount: 4,
    });
    expect(insights.some((i) => i.id === "strong-repeat-rate")).toBe(true);
  });

  it("returns nothing noteworthy for a healthy, unremarkable store", () => {
    const insights = computeGrowthInsights({
      ...baseInput,
      productRevenues: [
        { title: "A", totalMinor: 50 },
        { title: "B", totalMinor: 50 },
      ],
      activeCouponCount: 1,
    });
    expect(insights).toEqual([]);
  });
});
