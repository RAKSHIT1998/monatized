import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("admin can log in, see platform data, and edit a plan", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_SEED_EMAIL || "admin@monetized.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();
  await expect(page.getByText("MRR")).toBeVisible();
  await expect(page.getByText("Refund rate")).toBeVisible();
  await expect(page.getByText("Average order value")).toBeVisible();
  await expect(page.getByText("Paying creators")).toBeVisible();
  await expect(page.getByText("Gross volume — last 30 days")).toBeVisible();
  await expect(page.getByText("Top creators by revenue")).toBeVisible();

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

test("admin can search creators and change a creator's plan directly", async ({ page, browser }) => {
  const creatorContext = await browser.newContext();
  const creatorPage = await creatorContext.newPage();
  const email = `adminmanaged-${Date.now()}@example.com`;
  const username = `adminmgd${Date.now()}`.slice(0, 20);
  await signupAndOnboard(creatorPage, { email, username });
  await creatorContext.close();

  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_SEED_EMAIL || "admin@monetized.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto(`/admin/creators?q=${username}`);
  const row = page.getByRole("row", { name: new RegExp(username) });
  await expect(row).toBeVisible();
  await expect(row.locator('[data-slot="badge"]')).toHaveText("Free");

  await row.locator("select").selectOption({ label: "Pro" });
  await row.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText("Plan updated.")).toBeVisible();
  await expect(row.locator('[data-slot="badge"]')).toHaveText("Pro");

  // A search with no matches shows the empty state instead of every creator.
  await page.goto("/admin/creators?q=zzz-no-such-creator-zzz");
  await expect(page.getByText(/No creators match/)).toBeVisible();
});

test("admin can filter orders by status and search", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_SEED_EMAIL || "admin@monetized.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/orders?q=zzz-no-such-order-zzz");
  await expect(page.getByText("No orders match this search.")).toBeVisible();

  await page.goto("/admin/orders?status=PENDING");
  const rows = page.locator("tbody tr");
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toContainText("PENDING");
  }
});
