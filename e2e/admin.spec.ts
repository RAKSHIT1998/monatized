import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("admin can log in, see platform data, and edit a plan", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_SEED_EMAIL || "admin@monetized.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();

  await page.goto("/admin/creators");
  await expect(page.getByRole("heading", { name: "Creators" })).toBeVisible();

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  await page.goto("/admin/plans");
  await expect(page.getByRole("heading", { name: "Plans" })).toBeVisible();
  const freePlanCard = page.locator('[data-slot="card"]', { hasText: "FREE" }).first();
  const feeInput = freePlanCard.locator('input[name="platformFeeBps"]');
  await feeInput.fill("250");
  await freePlanCard.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText("Free plan updated.")).toBeVisible();
});

test("a regular creator cannot reach the admin area", async ({ page }) => {
  const email = `notadmin-${Date.now()}@example.com`;
  const username = `notadmin${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/admin");
  await page.waitForURL(/\/dashboard$/);
});
