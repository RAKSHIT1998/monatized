import * as z from "zod";

export const moduleTitleSchema = z.object({
  title: z.string().trim().min(2, "Give this module a title.").max(120),
});

export const lessonSchema = z
  .object({
    title: z.string().trim().min(2, "Give this lesson a title.").max(120),
    contentType: z.enum(["VIDEO", "TEXT"]),
    // Restricted to http(s) — this renders directly in an <iframe src>, and
    // plain z.url() accepts scheme-only URLs like `javascript:` or `data:`
    // (the WHATWG URL parser considers them valid), which would execute as
    // a stored XSS against every buyer who opens the lesson.
    videoUrl: z
      .url({ protocol: /^https?$/, error: "Enter a valid embed URL (must start with http:// or https://)." })
      .optional()
      .or(z.literal("")),
    textContent: z.string().trim().max(20_000, "Keep lesson text under 20,000 characters.").optional(),
  })
  .refine((data) => data.contentType !== "VIDEO" || data.videoUrl, {
    message: "Add an embed URL for a video lesson.",
    path: ["videoUrl"],
  })
  .refine((data) => data.contentType !== "TEXT" || data.textContent, {
    message: "Add some text for a text lesson.",
    path: ["textContent"],
  });
