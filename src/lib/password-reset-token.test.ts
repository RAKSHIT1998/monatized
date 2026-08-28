import { describe, expect, it } from "vitest";
import { generatePasswordResetToken, hashPasswordResetToken } from "./password-reset-token";

describe("generatePasswordResetToken / hashPasswordResetToken", () => {
  it("returns a token whose hash matches hashPasswordResetToken(token)", () => {
    const { token, tokenHash } = generatePasswordResetToken();
    expect(hashPasswordResetToken(token)).toBe(tokenHash);
  });

  it("never stores the raw token as its own hash", () => {
    const { token, tokenHash } = generatePasswordResetToken();
    expect(tokenHash).not.toBe(token);
  });

  it("generates a different token (and hash) every call", () => {
    const first = generatePasswordResetToken();
    const second = generatePasswordResetToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("a different token hashes to a different value", () => {
    const { tokenHash } = generatePasswordResetToken();
    expect(hashPasswordResetToken("not-the-real-token")).not.toBe(tokenHash);
  });
});
