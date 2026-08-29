import * as z from "zod";

export const productDetailsSchema = z.object({
  title: z.string().trim().min(2, "Give your product a title.").max(120),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters.").optional(),
  priceAmount: z.coerce
    .number()
    .min(0, "Price can't be negative.")
    .max(10_000_000, "That price looks too high."),
});

export type ProductDetailsInput = z.infer<typeof productDetailsSchema>;

export const MAX_PRODUCT_FILE_BYTES = 500 * 1024 * 1024; // 500MB

// Blank/omitted means unlimited stock — only coerce+validate when a value was
// actually entered.
export const stockQuantitySchema = z
  .union([
    z.null(),
    z.undefined(),
    z.literal(""),
    z.coerce.number().int().min(0, "Stock can't be negative.").max(1_000_000),
  ])
  .transform((v) => (v === null || v === undefined || v === "" ? null : v));

// Blank/omitted means free shipping — same shape as stockQuantitySchema, in
// rupees (converted to minor units at the action layer, like priceAmount).
export const shippingFeeSchema = z
  .union([
    z.null(),
    z.undefined(),
    z.literal(""),
    z.coerce.number().min(0, "Shipping fee can't be negative.").max(100_000, "That shipping fee looks too high."),
  ])
  .transform((v) => (v === null || v === undefined || v === "" ? null : v));
