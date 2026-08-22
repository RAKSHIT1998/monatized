import * as z from "zod";

export const availabilityRuleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startMinute: z.coerce.number().int().min(0).max(1439),
    endMinute: z.coerce.number().int().min(1).max(1440),
  })
  .refine((data) => data.endMinute > data.startMinute, {
    message: "End time must be after start time.",
    path: ["endMinute"],
  });

export const bookingDurationSchema = z.coerce
  .number()
  .int()
  .min(5, "Sessions must be at least 5 minutes.")
  .max(480, "Sessions can't be longer than 8 hours.");

export const bookingSlotSelectionSchema = z.object({
  startsAt: z.iso.datetime({ message: "Pick a valid time slot." }),
});
