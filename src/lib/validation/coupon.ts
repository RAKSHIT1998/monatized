import * as z from "zod";

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "At least 3 characters.")
      .max(20, "At most 20 characters.")
      .regex(/^[A-Z0-9]+$/, "Letters and numbers only."),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.coerce.number().int().positive("Must be greater than 0."),
    maxRedemptions: z.string().trim(), // "" = unlimited — parsed in the action
    expiresAt: z.string().trim(), // "" = never — parsed in the action
  })
  .refine((data) => data.discountType !== "PERCENT" || data.discountValue <= 100, {
    message: "A percentage discount can't exceed 100.",
    path: ["discountValue"],
  });
