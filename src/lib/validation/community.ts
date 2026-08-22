import * as z from "zod";

export const postSchema = z.object({
  title: z.string().trim().min(2, "Give this post a title.").max(150),
  body: z.string().trim().min(1, "Write something for your members.").max(10_000),
  membersOnly: z.boolean(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(2_000),
});
