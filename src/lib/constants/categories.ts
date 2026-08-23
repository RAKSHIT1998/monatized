// The full monetization menu from the product vision. Recorded during
// onboarding for personalization regardless of active status; "active" just
// controls the storefront-category badge on the marketing landing page.
// Physical products and donations/tips have no dedicated feature (no
// shipping/inventory, no free-form tip flow) and stay "coming soon".
export const MONETIZATION_CATEGORIES = [
  { value: "digital-products", label: "Digital products", active: true },
  { value: "courses", label: "Courses", active: true },
  { value: "coaching", label: "Coaching & consultations", active: true },
  { value: "subscriptions", label: "Subscriptions", active: true },
  { value: "community", label: "Community", active: true },
  { value: "physical-products", label: "Physical products", active: false },
  { value: "donations", label: "Donations & tips", active: false },
  { value: "affiliate", label: "Affiliate products", active: true },
] as const;

export type MonetizationCategory = (typeof MONETIZATION_CATEGORIES)[number]["value"];

export const MONETIZATION_CATEGORY_VALUES = MONETIZATION_CATEGORIES.map((c) => c.value);
