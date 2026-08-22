import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can change their password, and it takes effect immediately", async ({
  page,
  browser,
}) => {
  const email = `settings-${Date.now()}@example.com`;
  const username = `sett${Date.now()}`.slice(0, 20);
  const oldPassword = "correct-horse-battery";
  const newPassword = "new-correct-horse-battery";

  await signupAndOnboard(page, { email, username, password: oldPassword });

  await page.goto("/dashboard/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  await page.getByLabel("Current password").fill(oldPassword);
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: /update password/i }).click();
  await expect(page.getByText(/password updated/i)).toBeVisible();

  // The current tab should still be authenticated — no redirect to login.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  // A fresh session must log in with the NEW password, not the old one.
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();

  await freshPage.goto("/login");
  await freshPage.getByLabel("Email").fill(email);
  await freshPage.getByLabel("Password").fill(oldPassword);
  await freshPage.getByRole("button", { name: /^log in$/i }).click();
  await expect(freshPage.getByText(/invalid email or password/i)).toBeVisible();

  // Refill both fields rather than assuming the email field survived the failed
  // submission above — whether the form round-trips via a client update or a full
  // reload is an implementation detail this test shouldn't depend on.
  await freshPage.getByLabel("Email").fill(email);
  await freshPage.getByLabel("Password").fill(newPassword);
  await freshPage.getByRole("button", { name: /^log in$/i }).click();
  await expect(freshPage.getByRole("heading", { name: "Overview" })).toBeVisible({
    timeout: 45_000,
  });
  expect(freshPage.url()).toContain("/dashboard");

  await freshContext.close();
});
