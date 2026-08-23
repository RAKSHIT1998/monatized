import { describe, expect, it } from "vitest";
import { customDomainSchema } from "./domain";

describe("customDomainSchema", () => {
  it("accepts a bare subdomain", () => {
    const result = customDomainSchema.safeParse({ domain: "store.mybrand.com" });
    expect(result.success).toBe(true);
  });

  it("lowercases and trims the domain", () => {
    const result = customDomainSchema.safeParse({ domain: "  Store.MyBrand.COM  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.domain).toBe("store.mybrand.com");
  });

  it("rejects a URL with a protocol", () => {
    const result = customDomainSchema.safeParse({ domain: "https://store.mybrand.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a domain with a path", () => {
    const result = customDomainSchema.safeParse({ domain: "store.mybrand.com/shop" });
    expect(result.success).toBe(false);
  });

  it("rejects a bare single-label host with no dot", () => {
    const result = customDomainSchema.safeParse({ domain: "mybrand" });
    expect(result.success).toBe(false);
  });
});
