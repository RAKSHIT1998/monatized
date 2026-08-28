import { test, expect } from "@playwright/test";
import { signupAndOnboard, createPasswordResetToken } from "./helpers";

test("creator can reset a forgotten password and the old password stops working", async ({
  page,
  browser,
}) => {
  const email = `resetpw-${Date.now()}@example.com`;
  const username = `rst${Date.now()}`.slice(0, 20);
  const oldPassword = "correct-horse-battery";
  const newPassword = "new-correct-horse-battery";
  await signupAndOnboard(page, { email, username, password: oldPassword });

  // The "enter your email" step — same generic message regardless of whether
  // the email exists, so this only proves the form submits successfully.
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /send reset link/i }).click();
  await expect(page.getByText(/if an account exists for that email/i)).toBeVisible();

  const token = createPasswordResetToken(email);

  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: /reset password/i }).click();
  await page.waitForURL(/\/login\?reset=success/);
  await expect(page.getByText(/your password has been reset/i)).toBeVisible();

  // New password works.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard$/);

  // Old password no longer does, from a fresh (logged-out) context.
  const oldPasswordContext = await browser.newContext();
  const oldPasswordPage = await oldPasswordContext.newPage();
  await oldPasswordPage.goto("/login");
  await oldPasswordPage.getByLabel("Email").fill(email);
  await oldPasswordPage.getByLabel("Password").fill(oldPassword);
  await oldPasswordPage.getByRole("button", { name: /^log in$/i }).click();
  await expect(oldPasswordPage.getByText("Invalid email or password.")).toBeVisible();
  await oldPasswordContext.close();
});

test("an expired or invalid reset token shows a clear error instead of resetting anything", async ({
  page,
}) => {
  await page.goto("/reset-password?token=not-a-real-token");
  await page.getByLabel("New password").fill("whatever-password-123");
  await page.getByRole("button", { name: /reset password/i }).click();
  await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
});
