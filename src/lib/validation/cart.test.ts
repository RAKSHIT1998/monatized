import { describe, expect, it } from "vitest";
import { cartItemsSchema, parseCartItemsJson } from "./cart";

describe("cartItemsSchema", () => {
  it("accepts a valid array of cart lines", () => {
    const result = cartItemsSchema.safeParse([
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ]);
    expect(result.success).toBe(true);
  });

  it("coerces a numeric-string quantity", () => {
    const result = cartItemsSchema.safeParse([{ productId: "p1", quantity: "3" }]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0].quantity).toBe(3);
  });

  it("rejects an empty cart", () => {
    const result = cartItemsSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("rejects a quantity of zero", () => {
    const result = cartItemsSchema.safeParse([{ productId: "p1", quantity: 0 }]);
    expect(result.success).toBe(false);
  });

  it("rejects a quantity over the per-line cap", () => {
    const result = cartItemsSchema.safeParse([{ productId: "p1", quantity: 21 }]);
    expect(result.success).toBe(false);
  });

  it("rejects more lines than the cart cap", () => {
    const lines = Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));
    const result = cartItemsSchema.safeParse(lines);
    expect(result.success).toBe(false);
  });

  it("rejects a missing productId", () => {
    const result = cartItemsSchema.safeParse([{ quantity: 1 }]);
    expect(result.success).toBe(false);
  });
});

describe("parseCartItemsJson", () => {
  it("parses valid JSON into validated cart lines", () => {
    const result = parseCartItemsJson(JSON.stringify([{ productId: "p1", quantity: 2 }]));
    expect(result).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("returns null for malformed JSON", () => {
    expect(parseCartItemsJson("not json")).toBeNull();
  });

  it("returns null for JSON that fails schema validation", () => {
    expect(parseCartItemsJson(JSON.stringify([{ productId: "p1", quantity: -1 }]))).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(parseCartItemsJson("[]")).toBeNull();
  });
});
