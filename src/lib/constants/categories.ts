// The full monetization menu from the product vision. Recorded during
// onboarding for personalization regardless of active status; "active"
// controls both the storefront-category badge on the marketing landing page
// and whether the checkbox is selectable in onboarding (see
// onboarding-wizard.tsx's `disabled={!category.active}`) — every category
// below now has a real, shippable feature behind it.
export const MONETIZATION_CATEGORIES = [
  { value: "digital-products", label: "Digital products", active: true },
  { value: "courses", label: "Courses", active: true },
  { value: "coaching", label: "Coaching & consultations", active: true },
  { value: "subscriptions", label: "Subscriptions", active: true },
  { value: "community", label: "Community", active: true },
  { value: "physical-products", label: "Physical products", active: true },
  { value: "donations", label: "Donations & tips", active: true },
  { value: "affiliate", label: "Affiliate products", active: true },
] as const;

export type MonetizationCategory = (typeof MONETIZATION_CATEGORIES)[number]["value"];

export const MONETIZATION_CATEGORY_VALUES = MONETIZATION_CATEGORIES.map((c) => c.value);
