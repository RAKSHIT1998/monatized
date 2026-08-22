import { test } from "@playwright/test";

test("visitor can sign up and lands past the auth gate", async ({ page }) => {
  const email = `smoke-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Smoke Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: /create free store/i }).click();

  await page.waitForURL(/\/onboarding/);
});

test("protected dashboard route redirects anonymous visitors to login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
});
