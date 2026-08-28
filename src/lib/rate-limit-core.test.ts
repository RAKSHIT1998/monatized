import { describe, expect, it, vi, afterEach } from "vitest";
import { checkRateLimit, formatRetryAfter } from "./rate-limit-core";

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
  });

  it("blocks once the limit is exceeded within the window", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 2, 1000);
    checkRateLimit(key, 2, 1000);
    const result = checkRateLimit(key, 2, 1000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    checkRateLimit(keyA, 1, 1000);
    expect(checkRateLimit(keyA, 1, 1000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 1, 1000).allowed).toBe(true);
  });

  it("resets the count once the window has passed", () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 1, 1000);
    expect(checkRateLimit(key, 1, 1000).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit(key, 1, 1000).allowed).toBe(true);
  });
});

describe("formatRetryAfter", () => {
  it("says 'a minute' for anything under or at a minute", () => {
    expect(formatRetryAfter(30)).toBe("a minute");
    expect(formatRetryAfter(60)).toBe("a minute");
  });

  it("rounds up to whole minutes above a minute", () => {
    expect(formatRetryAfter(61)).toBe("2 minutes");
    expect(formatRetryAfter(120)).toBe("2 minutes");
  });
});
