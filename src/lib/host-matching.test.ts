import { describe, expect, it } from "vitest";
import { isOwnHost } from "./host-matching";

describe("isOwnHost", () => {
  it("treats localhost (with any port) as an own host", () => {
    expect(isOwnHost("localhost:3000")).toBe(true);
    expect(isOwnHost("localhost:3002")).toBe(true);
  });

  it("treats the configured APP_URL's hostname as an own host", () => {
    expect(isOwnHost("monetized.com", "https://monetized.com")).toBe(true);
    expect(isOwnHost("monetized.com:443", "https://monetized.com")).toBe(true);
  });

  it("treats a vercel.app preview deployment as an own host", () => {
    expect(isOwnHost("my-app-git-main.vercel.app")).toBe(true);
  });

  it("treats an unrelated domain as NOT an own host", () => {
    expect(isOwnHost("store.creator-brand.com", "https://monetized.com")).toBe(false);
  });

  it("does not match a suffix as a substring of an unrelated domain", () => {
    // "notlocalhost.com" must not match just because it contains "localhost"
    expect(isOwnHost("notlocalhost.com")).toBe(false);
  });

  it("falls back to the suffix list when APP_URL is malformed", () => {
    expect(isOwnHost("localhost:3000", "not-a-valid-url")).toBe(true);
    expect(isOwnHost("store.creator-brand.com", "not-a-valid-url")).toBe(false);
  });
});
