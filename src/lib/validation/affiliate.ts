import * as z from "zod";

export const affiliateSchema = z.object({
  name: z.string().trim().min(2, "Enter the affiliate's name.").max(120),
  email: z.email("Enter a valid email."),
  code: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(20, "Keep it under 20 characters.")
    .regex(/^[a-zA-Z0-9]+$/, "Letters and numbers only.")
    .transform((value) => value.toUpperCase()),
  commissionPercent: z.coerce
    .number()
    .min(1, "Commission must be at least 1%.")
    .max(75, "Commission can't exceed 75%."),
});
