import { describe, expect, it } from "vitest";
import { variantLabelSchema } from "./product-variants";

describe("variantLabelSchema", () => {
  it("accepts a normal label", () => {
    const result = variantLabelSchema.safeParse("Red");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Red");
  });

  it("trims whitespace", () => {
    const result = variantLabelSchema.safeParse("  Small  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Small");
  });

  it("rejects an empty label", () => {
    expect(variantLabelSchema.safeParse("").success).toBe(false);
  });

  it("rejects a label that is only whitespace", () => {
    expect(variantLabelSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a label over 60 characters", () => {
    expect(variantLabelSchema.safeParse("x".repeat(61)).success).toBe(false);
  });

  it("allows exactly 60 characters", () => {
    expect(variantLabelSchema.safeParse("x".repeat(60)).success).toBe(true);
  });
});
