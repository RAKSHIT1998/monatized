// No "server-only" guard, unlike src/lib/password.ts — this is pure
// node:crypto logic with no DB/env access, so it's safe to unit-test
// directly (see password-reset-token.test.ts).
import { randomBytes, createHash } from "node:crypto";

// Unlike a user-chosen password, this token is 256 bits of random data —
// a fast SHA-256 hash (rather than bcrypt) is fine since brute-forcing it
// is already infeasible regardless of hash speed.
export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
