import * as z from "zod";

export const storeAppearanceSchema = z.object({
  displayName: z.string().trim().min(2, "Tell us your name or brand name."),
  bio: z.string().trim().max(280, "Keep your bio under 280 characters.").optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color."),
  buttonStyle: z.enum(["solid", "outline"]),
  instagram: z.url("Enter a full URL.").optional().or(z.literal("")),
  youtube: z.url("Enter a full URL.").optional().or(z.literal("")),
  tiktok: z.url("Enter a full URL.").optional().or(z.literal("")),
  twitter: z.url("Enter a full URL.").optional().or(z.literal("")),
  website: z.url("Enter a full URL.").optional().or(z.literal("")),
});

export type StoreAppearanceInput = z.infer<typeof storeAppearanceSchema>;

export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
