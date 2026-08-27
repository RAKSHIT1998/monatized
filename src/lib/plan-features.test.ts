import { describe, expect, it } from "vitest";
import { hasFeatureAccess, featureUpgradeMessage, minPlanFor, planDisplayName } from "./plan-features";

describe("hasFeatureAccess", () => {
  it("denies a Free-plan creator access to Pro-gated features", () => {
    expect(hasFeatureAccess("FREE", "AUTOMATIONS")).toBe(false);
    expect(hasFeatureAccess("FREE", "CUSTOM_DOMAIN")).toBe(false);
    expect(hasFeatureAccess("FREE", "GROWTH_ENGINE")).toBe(false);
  });

  it("denies a Creator-plan creator access to Pro-gated features", () => {
    expect(hasFeatureAccess("CREATOR", "AUTOMATIONS")).toBe(false);
  });

  it("allows a Pro-plan creator access", () => {
    expect(hasFeatureAccess("PRO", "AUTOMATIONS")).toBe(true);
    expect(hasFeatureAccess("PRO", "CUSTOM_DOMAIN")).toBe(true);
    expect(hasFeatureAccess("PRO", "GROWTH_ENGINE")).toBe(true);
  });

  it("allows a Business-plan creator access (a higher tier than the minimum)", () => {
    expect(hasFeatureAccess("BUSINESS", "AUTOMATIONS")).toBe(true);
  });
});

describe("featureUpgradeMessage", () => {
  it("names the minimum required plan", () => {
    expect(featureUpgradeMessage("AUTOMATIONS")).toContain("Pro");
  });
});

describe("minPlanFor / planDisplayName", () => {
  it("reports Pro as the minimum plan for every currently-gated feature", () => {
    expect(minPlanFor("AUTOMATIONS")).toBe("PRO");
    expect(minPlanFor("CUSTOM_DOMAIN")).toBe("PRO");
    expect(minPlanFor("GROWTH_ENGINE")).toBe("PRO");
    expect(planDisplayName(minPlanFor("AUTOMATIONS"))).toBe("Pro");
  });
});
