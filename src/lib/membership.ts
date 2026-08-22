import type { SubscriptionStatus } from "@/generated/prisma/enums";

// A grace period matches the member page's own "you can still cancel from
// here" treatment of PAST_DUE — access isn't pulled until the subscription is
// actually CANCELLED/EXPIRED, not on the first missed renewal.
export function hasActiveMembership(status: SubscriptionStatus) {
  return status === "ACTIVE" || status === "PAST_DUE";
}
