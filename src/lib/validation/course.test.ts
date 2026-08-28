import { describe, expect, it } from "vitest";
import { lessonSchema } from "./course";

describe("lessonSchema videoUrl", () => {
  const base = { title: "Welcome", contentType: "VIDEO" as const };

  it("accepts a real https embed URL", () => {
    const result = lessonSchema.safeParse({ ...base, videoUrl: "https://www.youtube.com/embed/abc" });
    expect(result.success).toBe(true);
  });

  it("accepts http (not just https)", () => {
    const result = lessonSchema.safeParse({ ...base, videoUrl: "http://example.com/embed" });
    expect(result.success).toBe(true);
  });

  // A stored-XSS vector: <iframe src="javascript:..."> executes in the
  // course viewer's origin for every buyer who opens the lesson. Plain
  // z.url() treats this as a syntactically valid URL (WHATWG allows
  // scheme-only URLs), so the schema must explicitly restrict the protocol.
  it("rejects a javascript: URL", () => {
    const result = lessonSchema.safeParse({ ...base, videoUrl: "javascript:alert(document.cookie)" });
    expect(result.success).toBe(false);
  });

  it("rejects a data: URL", () => {
    const result = lessonSchema.safeParse({
      ...base,
      videoUrl: "data:text/html,<script>alert(1)</script>",
    });
    expect(result.success).toBe(false);
  });

  it("rejects other non-http schemes", () => {
    const result = lessonSchema.safeParse({ ...base, videoUrl: "vbscript:msgbox(1)" });
    expect(result.success).toBe(false);
  });
});
