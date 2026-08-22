import { describe, expect, it } from "vitest";
import { productDetailsSchema } from "./product";

describe("productDetailsSchema", () => {
  it("accepts a valid product and coerces price to a number", () => {
    const result = productDetailsSchema.safeParse({
      title: "30-Day Fitness Plan",
      description: "A complete plan.",
      priceAmount: "499",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceAmount).toBe(499);
    }
  });

  it("allows a free (zero-price) product", () => {
    const result = productDetailsSchema.safeParse({ title: "Freebie", priceAmount: "0" });
    expect(result.success).toBe(true);
  });

  it("rejects a negative price", () => {
    const result = productDetailsSchema.safeParse({ title: "Bad", priceAmount: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects a title under 2 characters", () => {
    const result = productDetailsSchema.safeParse({ title: "X", priceAmount: "10" });
    expect(result.success).toBe(false);
  });

  it("makes description optional", () => {
    const result = productDetailsSchema.safeParse({ title: "No description", priceAmount: "10" });
    expect(result.success).toBe(true);
  });
});
