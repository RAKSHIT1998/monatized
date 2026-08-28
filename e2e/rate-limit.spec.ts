import { test, expect } from "@playwright/test";
import { signupAndOnboard, readPasswordResetTokenExpiry } from "./helpers";

test("login is rate-limited after repeated failed attempts, even with the right password", async ({
  page,
  browser,
}) => {
  const email = `ratelimit-${Date.now()}@example.com`;
  const username = `rl${Date.now()}`.slice(0, 20);
  const correctPassword = "correct-horse-battery";
  await signupAndOnboard(page, { email, username, password: correctPassword });

  // Attempts from a fresh (logged-out) context — the login rate limit is
  // per-email, so it doesn't matter that the creator page above is signed in.
  const attemptContext = await browser.newContext();
  const attemptPage = await attemptContext.newPage();

  for (let i = 0; i < 5; i++) {
    await attemptPage.goto("/login");
    await attemptPage.getByLabel("Email").fill(email);
    await attemptPage.getByLabel("Password").fill("wrong-password");
    await attemptPage.getByRole("button", { name: /^log in$/i }).click();
    await expect(attemptPage.getByText("Invalid email or password.")).toBeVisible();
  }

  // The 6th attempt is blocked by the rate limit — even with the correct
  // password, proving the limit isn't just re-validating credentials.
  await attemptPage.goto("/login");
  await attemptPage.getByLabel("Email").fill(email);
  await attemptPage.getByLabel("Password").fill(correctPassword);
  await attemptPage.getByRole("button", { name: /^log in$/i }).click();
  await expect(attemptPage.getByText(/too many login attempts/i)).toBeVisible();
  await attemptContext.close();
});

test("password reset requests are rate-limited without revealing it in the response", async ({
  page,
}) => {
  const email = `resetlimit-${Date.now()}@example.com`;
  const username = `rsl${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  const genericMessage = /if an account exists for that email/i;

  // Three requests is the limit — all genuinely issue a new token.
  for (let i = 0; i < 3; i++) {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(genericMessage)).toBeVisible();
  }
  const expiryAfterLimit = readPasswordResetTokenExpiry(email);
  expect(expiryAfterLimit).not.toBe("null");

  // The 4th request shows the exact same generic message — by design, this
  // response never reveals that a limit was hit — but the DB token must be
  // unchanged, proving this request was actually a no-op.
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send reset link/i }).click();
  await expect(page.getByText(genericMessage)).toBeVisible();

  const expiryAfterRateLimitedRequest = readPasswordResetTokenExpiry(email);
  expect(expiryAfterRateLimitedRequest).toBe(expiryAfterLimit);
});

// Signup's rate limit is intentionally much more generous than login/reset's
// (see the comment at its call site) specifically so it doesn't collide with
// this suite's own signups — every other spec's signupAndOnboard() call
// already exercises "does a real signup still succeed with the limiter
// wired in" across ~30 signups per full run without tripping it. Actually
// driving the limiter to its blocked state here would mean either padding
// this one test out to 50+ real signups (slow, and it'd eat most of the
// budget the rest of the suite is quietly relying on) or shrinking the
// production limit to something an office/campus IP could hit legitimately
// — the core blocking logic itself is already covered by
// rate-limit-core.test.ts, and the wiring pattern (checkRateLimit → generic
// message) is identical to login's and reset's, both proven above.
test("signup still succeeds normally with the rate limiter wired in", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Rate Limit Test");
  await page.getByLabel("Email").fill(`signuplimit-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: /create free store/i }).click();
  await page.waitForURL(/\/onboarding/);
});
