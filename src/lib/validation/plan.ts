import * as z from "zod";

export const updatePlanSchema = z.object({
  planId: z.string().min(1),
  name: z.string().trim().min(2, "Plan needs a name."),
  priceMonthlyMinor: z.coerce.number().int().min(0),
  productLimit: z.string().trim(), // "" means unlimited — parsed in the action
  platformFeeBps: z.coerce.number().int().min(0).max(10_000),
  removesBranding: z.coerce.boolean(),
  isActive: z.coerce.boolean(),
});
