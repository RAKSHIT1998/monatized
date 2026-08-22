import * as z from "zod";
import { MONETIZATION_CATEGORY_VALUES } from "@/lib/constants/categories";

export const businessBasicsSchema = z.object({
  displayName: z.string().trim().min(2, "Tell us your name or brand name."),
  categories: z
    .array(z.enum(MONETIZATION_CATEGORY_VALUES as [string, ...string[]]))
    .min(1, "Pick at least one thing you want to monetize."),
});

export const claimUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Must be at least 3 characters.")
    .max(20, "Must be at most 20 characters.")
    .regex(/^[a-z0-9]+$/, "Only lowercase letters and numbers, no spaces or symbols."),
  bio: z.string().trim().max(280, "Keep your bio under 280 characters.").optional(),
});

export type BusinessBasicsInput = z.infer<typeof businessBasicsSchema>;
export type ClaimUsernameInput = z.infer<typeof claimUsernameSchema>;
