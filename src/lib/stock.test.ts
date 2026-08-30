import { describe, expect, it } from "vitest";
import { isProductSoldOut } from "./stock";

describe("isProductSoldOut", () => {
  it("is not sold out when stock is unlimited (null) and there are no variants", () => {
    expect(isProductSoldOut({ stockQuantity: null, variants: [] })).toBe(false);
  });

  it("is sold out when product-level stock hits zero and there are no variants", () => {
    expect(isProductSoldOut({ stockQuantity: 0, variants: [] })).toBe(true);
  });

  it("is not sold out when product-level stock is positive", () => {
    expect(isProductSoldOut({ stockQuantity: 3, variants: [] })).toBe(false);
  });

  it("ignores product-level stock once variants exist", () => {
    expect(
      isProductSoldOut({
        stockQuantity: 0,
        variants: [{ stockQuantity: 5 }],
      }),
    ).toBe(false);
  });

  it("is sold out only when every variant is at zero", () => {
    expect(
      isProductSoldOut({
        stockQuantity: null,
        variants: [{ stockQuantity: 0 }, { stockQuantity: 0 }],
      }),
    ).toBe(true);
  });

  it("is not sold out when at least one variant has stock", () => {
    expect(
      isProductSoldOut({
        stockQuantity: null,
        variants: [{ stockQuantity: 0 }, { stockQuantity: 2 }],
      }),
    ).toBe(false);
  });

  it("is not sold out when at least one variant has unlimited stock", () => {
    expect(
      isProductSoldOut({
        stockQuantity: null,
        variants: [{ stockQuantity: 0 }, { stockQuantity: null }],
      }),
    ).toBe(false);
  });
});
