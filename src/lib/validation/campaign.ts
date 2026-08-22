import * as z from "zod";

export const campaignSchema = z.object({
  subject: z.string().trim().min(2, "Give this email a subject.").max(150),
  body: z.string().trim().min(1, "Write something to send.").max(10_000),
  audience: z.enum(["ALL_CUSTOMERS", "ACTIVE_SUBSCRIBERS"]),
});
