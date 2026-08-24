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

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(1, "Enter the name on the package.").max(120),
  line1: z.string().trim().min(1, "Enter a street address.").max(200),
  line2: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  city: z.string().trim().min(1, "Enter a city.").max(120),
  state: z.string().trim().min(1, "Enter a state/region.").max(120),
  postalCode: z.string().trim().min(1, "Enter a postal code.").max(20),
  country: z.string().trim().min(1, "Enter a country.").max(120),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

// A platform-wide floor (₹1) just to keep out zero/negative tips — the
// creator's suggested amount is a preset, never an enforced minimum.
export const MIN_TIP_AMOUNT = 1;

export const tipAmountSchema = z.coerce
  .number()
  .min(MIN_TIP_AMOUNT, `Enter at least ₹${MIN_TIP_AMOUNT}.`)
  .max(10_000_000, "That amount looks too high.");
