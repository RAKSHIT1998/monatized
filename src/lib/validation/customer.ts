import * as z from "zod";

export const updateCustomerDetailsSchema = z.object({
  tags: z
    .string()
    .trim()
    .transform((value) =>
      value === ""
        ? []
        : Array.from(
            new Set(
              value
                .split(",")
                .map((tag) => tag.trim().toLowerCase())
                .filter(Boolean),
            ),
          ),
    ),
  notes: z.string().trim().max(2000, "Keep notes under 2000 characters.").optional(),
});
