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
