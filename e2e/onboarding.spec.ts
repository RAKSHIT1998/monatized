import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can sign up, complete onboarding, and reach the dashboard", async ({ page }) => {
  const email = `onboarding-${Date.now()}@example.com`;
  const username = `ada${Date.now()}`.slice(0, 20);

  await signupAndOnboard(page, { name: "Ada Creator", email, username });

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Get your store ready")).toBeVisible();

  await page.goto("/dashboard/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.getByText("0 of 3 products used")).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();
});
