import * as z from "zod";

export const startCheckoutSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  name: z.string().trim().max(120).optional(),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});
