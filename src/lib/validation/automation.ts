import * as z from "zod";

export const automationSchema = z
  .object({
    trigger: z.enum(["ORDER_PAID", "NEW_SUBSCRIBER", "SUBSCRIPTION_CANCELLED"]),
    actionType: z.enum(["ADD_CUSTOMER_TAG", "SEND_EMAIL"]),
    tag: z.string().trim().max(40).optional(),
    subject: z.string().trim().max(150).optional(),
    body: z.string().trim().max(10_000).optional(),
  })
  .refine((data) => data.actionType !== "ADD_CUSTOMER_TAG" || !!data.tag, {
    message: "Enter a tag to add.",
    path: ["tag"],
  })
  .refine((data) => data.actionType !== "SEND_EMAIL" || (!!data.subject && !!data.body), {
    message: "Enter both a subject and a message.",
    path: ["subject"],
  });
