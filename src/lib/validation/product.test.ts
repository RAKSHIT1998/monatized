import { describe, expect, it } from "vitest";
import { productDetailsSchema, shippingFeeSchema, stockQuantitySchema } from "./product";

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

describe("stockQuantitySchema", () => {
  it("treats a blank string as unlimited stock (null)", () => {
    const result = stockQuantitySchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("treats a missing field as unlimited stock (null)", () => {
    const result = stockQuantitySchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("coerces a numeric string to a number", () => {
    const result = stockQuantitySchema.safeParse("25");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(25);
  });

  it("rejects a negative stock count", () => {
    const result = stockQuantitySchema.safeParse("-1");
    expect(result.success).toBe(false);
  });

  it("allows zero (a product that is currently sold out)", () => {
    const result = stockQuantitySchema.safeParse("0");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(0);
  });
});

describe("shippingFeeSchema", () => {
  it("treats a blank string as free shipping (null)", () => {
    const result = shippingFeeSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("treats a missing field as free shipping (null)", () => {
    const result = shippingFeeSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("coerces a numeric string to a number", () => {
    const result = shippingFeeSchema.safeParse("49.5");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(49.5);
  });

  it("rejects a negative shipping fee", () => {
    const result = shippingFeeSchema.safeParse("-1");
    expect(result.success).toBe(false);
  });

  it("allows zero (an explicit free-shipping entry)", () => {
    const result = shippingFeeSchema.safeParse("0");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(0);
  });

  it("rejects a fee over the 100,000 cap", () => {
    const result = shippingFeeSchema.safeParse("100001");
    expect(result.success).toBe(false);
  });
});
