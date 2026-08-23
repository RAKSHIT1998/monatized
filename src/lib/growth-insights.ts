// Pure, rule-based insight computation — no db/server-only imports, so it's
// unit-testable. Deliberately NOT generative-AI-powered: these are honest,
// explainable heuristics over the creator's own numbers, not a model's guess.

export type GrowthInsight = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning";
};

export function computeGrowthInsights(input: {
  productRevenues: { title: string; totalMinor: number }[];
  productCount: number;
  pastDueSubscriberCount: number;
  checkoutStartedCount: number;
  orderCompletedCount: number;
  activeCouponCount: number;
  repeatCustomerCount: number;
  totalCustomerCount: number;
}): GrowthInsight[] {
  const insights: GrowthInsight[] = [];

  const totalRevenueMinor = input.productRevenues.reduce((sum, p) => sum + p.totalMinor, 0);
  const topProduct = [...input.productRevenues].sort((a, b) => b.totalMinor - a.totalMinor)[0];
  if (topProduct && totalRevenueMinor > 0) {
    const share = topProduct.totalMinor / totalRevenueMinor;
    if (share >= 0.7 && input.productRevenues.length > 1) {
      insights.push({
        id: "revenue-concentration",
        title: "Revenue is concentrated in one product",
        detail: `"${topProduct.title}" accounts for ${Math.round(share * 100)}% of your revenue. Consider promoting your other products to reduce reliance on one.`,
        severity: "warning",
      });
    }
  }

  if (input.pastDueSubscriberCount > 0) {
    insights.push({
      id: "past-due-subscribers",
      title: "Subscribers with a failed payment",
      detail: `${input.pastDueSubscriberCount} subscriber${input.pastDueSubscriberCount === 1 ? "" : "s"} ${input.pastDueSubscriberCount === 1 ? "is" : "are"} past due. Reach out before they churn — an Automation can email them automatically.`,
      severity: "warning",
    });
  }

  if (input.checkoutStartedCount >= 5) {
    const conversionRate = input.orderCompletedCount / input.checkoutStartedCount;
    if (conversionRate < 0.3) {
      insights.push({
        id: "low-conversion",
        title: "Low checkout conversion",
        detail: `Only ${Math.round(conversionRate * 100)}% of checkouts convert. A limited-time coupon can help push undecided buyers over the line.`,
        severity: "warning",
      });
    }
  }

  if (input.activeCouponCount === 0 && input.productCount > 0) {
    insights.push({
      id: "no-coupons",
      title: "No active coupons",
      detail: "A launch discount or referral code can be an easy way to drive first-time purchases.",
      severity: "info",
    });
  }

  if (input.totalCustomerCount >= 5) {
    const repeatRate = input.repeatCustomerCount / input.totalCustomerCount;
    if (repeatRate >= 0.3) {
      insights.push({
        id: "strong-repeat-rate",
        title: "Strong repeat customer rate",
        detail: `${Math.round(repeatRate * 100)}% of your customers have bought more than once — a subscription or bundle could turn even more of them into recurring revenue.`,
        severity: "info",
      });
    }
  }

  return insights;
}
