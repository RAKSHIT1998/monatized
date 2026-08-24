import { describe, expect, it } from "vitest";
import { shippingAddressSchema, tipAmountSchema } from "./checkout";

describe("shippingAddressSchema", () => {
  const valid = {
    name: "Priya Sharma",
    line1: "221B Baker Street",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "India",
  };

  it("accepts a complete address", () => {
    const result = shippingAddressSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("makes line2 optional", () => {
    const result = shippingAddressSchema.safeParse({ ...valid, line2: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.line2).toBeUndefined();
  });

  it("rejects a missing city", () => {
    const result = shippingAddressSchema.safeParse({ ...valid, city: "" });
    expect(result.success).toBe(false);
  });
});

describe("tipAmountSchema", () => {
  it("accepts a custom amount above the floor", () => {
    const result = tipAmountSchema.safeParse("250");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(250);
  });

  it("rejects an amount below the ₹1 floor", () => {
    const result = tipAmountSchema.safeParse("0");
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = tipAmountSchema.safeParse("-50");
    expect(result.success).toBe(false);
  });
});
