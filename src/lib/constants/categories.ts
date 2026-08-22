// The full monetization menu from the product vision. Only "digital-products" is
// wired up in Phase 1 — the rest are recorded during onboarding for personalization
// and will light up as their features ship in later phases.
export const MONETIZATION_CATEGORIES = [
  { value: "digital-products", label: "Digital products", active: true },
  { value: "courses", label: "Courses", active: false },
  { value: "coaching", label: "Coaching & consultations", active: false },
  { value: "subscriptions", label: "Subscriptions", active: false },
  { value: "community", label: "Community", active: false },
  { value: "physical-products", label: "Physical products", active: false },
  { value: "donations", label: "Donations & tips", active: false },
  { value: "affiliate", label: "Affiliate products", active: false },
] as const;

export type MonetizationCategory = (typeof MONETIZATION_CATEGORIES)[number]["value"];

export const MONETIZATION_CATEGORY_VALUES = MONETIZATION_CATEGORIES.map((c) => c.value);
