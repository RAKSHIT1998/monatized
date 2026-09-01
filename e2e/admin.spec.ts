import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard, createPaidOrder } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

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

  // That edit is now on record in the audit log — .first() because this
  // shared dev database accumulates one plan.updated entry per test run
  // across the whole suite's history, not just this one.
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByText("plan.updated").first()).toBeVisible();
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

test("admin can suspend and reactivate a creator's storefront", async ({ page, browser }) => {
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  const username = `suspendme${Date.now()}`.slice(0, 20);
  await signupAndOnboard(buyerPage, {
    email: `suspendcreator-${Date.now()}@example.com`,
    username,
  });

  // Storefront works before any suspension.
  const beforeSuspend = await buyerPage.goto(`/${username}`);
  expect(beforeSuspend?.status()).toBe(200);

  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_SEED_EMAIL || "admin@monetized.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/admin$/);

  // Suspend via the creator's detail page.
  await page.goto(`/admin/creators?q=${username}`);
  await page.getByRole("row", { name: new RegExp(username) }).getByRole("link").first().click();
  await page.waitForURL(/\/admin\/creators\//);
  await page.getByRole("button", { name: /^suspend store$/i }).click();
  await page.getByPlaceholder(/reason/i).fill("Investigating a buyer complaint.");
  await page.getByRole("button", { name: /^confirm suspension$/i }).click();
  await expect(page.getByText("Store suspended.")).toBeVisible();
  // exact: true — otherwise this also matches "Store suspended." itself
  // (getByText's default substring match is case-insensitive).
  await expect(page.getByText("Suspended", { exact: true })).toBeVisible();

  const afterSuspend = await buyerPage.goto(`/${username}`);
  expect(afterSuspend?.status()).toBe(404);

  await page.getByRole("button", { name: /^reactivate store$/i }).click();
  await expect(page.getByText("Store reactivated.")).toBeVisible();

  const afterReactivate = await buyerPage.goto(`/${username}`);
  expect(afterReactivate?.status()).toBe(200);

  await buyerContext.close();
});

test("admin can refund a disputed order directly, without the creator acting", async ({ page }) => {
  // The real checkout flow already has thorough coverage of its own
  // (checkout.spec.ts, cart.spec.ts, refunds.spec.ts) — what this test
  // actually exercises is the admin-side refund action, so the paid order
  // is created directly rather than driving a second full buyer checkout
  // through the browser on top of the creator's own signup+publish.
  const username = `adminrfd${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, {
    email: `adminrefundcreator-${Date.now()}@example.com`,
    username,
  });
  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Disputed Ebook");
  await page.getByLabel("Price (INR)").fill("299");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const buyerEmail = `adminrefundbuyer-${Date.now()}@example.com`;
  createPaidOrder(username, "disputed-ebook", buyerEmail);

  // Clear the creator's session before logging in as admin on the same
  // page — /login redirects an already-authenticated session straight past
  // the form (see proxy.ts's AUTH_ONLY_ROUTES check).
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.ADMIN_SEED_EMAIL || "admin@monetized.local");
  await page.getByLabel("Password").fill(process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto(`/admin/orders?q=${buyerEmail}`);
  await page.getByRole("link", { name: /^MON-/ }).click();
  await page.waitForURL(/\/admin\/orders\//);
  await page.getByRole("button", { name: /^refund$/i }).click();
  await expect(page.getByText(/refunds ₹299.*wasn't asked first/i)).toBeVisible();
  await page.getByRole("button", { name: /^refund order$/i }).click();
  await expect(page.getByText("Order refunded.")).toBeVisible();
  await expect(page.getByText("REFUNDED", { exact: true })).toBeVisible();
});
