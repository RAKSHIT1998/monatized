// Deliberately no "server-only" guard — pure enum/string logic with no
// secrets or DB access, so it's safe to share with client components (the
// dashboard nav uses it to show a "PRO" badge on gated links).
import type { PlanKey } from "@/generated/prisma/client";

// Ordered so a numeric comparison answers "does this plan meet the minimum?" —
// mirrors the tiers in prisma/seed.ts (Free < Creator < Pro < Business).
const PLAN_TIER: Record<PlanKey, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  BUSINESS: 3,
};

export type GatedFeature = "GROWTH_ENGINE" | "AUTOMATIONS" | "CUSTOM_DOMAIN";

const FEATURE_MIN_PLAN: Record<GatedFeature, PlanKey> = {
  GROWTH_ENGINE: "PRO",
  AUTOMATIONS: "PRO",
  CUSTOM_DOMAIN: "PRO",
};

const FEATURE_LABEL: Record<GatedFeature, string> = {
  GROWTH_ENGINE: "The AI growth engine",
  AUTOMATIONS: "Automations",
  CUSTOM_DOMAIN: "Custom domain",
};

const PLAN_DISPLAY_NAME: Record<PlanKey, string> = {
  FREE: "Free",
  CREATOR: "Creator",
  PRO: "Pro",
  BUSINESS: "Business",
};

export function minPlanFor(feature: GatedFeature): PlanKey {
  return FEATURE_MIN_PLAN[feature];
}

export function hasFeatureAccess(planKey: PlanKey, feature: GatedFeature): boolean {
  return PLAN_TIER[planKey] >= PLAN_TIER[FEATURE_MIN_PLAN[feature]];
}

export function featureLabel(feature: GatedFeature): string {
  return FEATURE_LABEL[feature];
}

export function planDisplayName(planKey: PlanKey): string {
  return PLAN_DISPLAY_NAME[planKey];
}

export function featureUpgradeMessage(feature: GatedFeature): string {
  const minPlan = planDisplayName(FEATURE_MIN_PLAN[feature]);
  return `${FEATURE_LABEL[feature]} is available on the ${minPlan} plan and above. Upgrade to unlock it.`;
}
