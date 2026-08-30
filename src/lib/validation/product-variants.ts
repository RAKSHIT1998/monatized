import * as z from "zod";

export const variantLabelSchema = z
  .string()
  .trim()
  .min(1, "Give this option a name.")
  .max(60, "Keep it under 60 characters.");
