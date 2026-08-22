import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can sell a subscription and a member can manage their membership", async ({
  page,
  browser,
}) => {
  const email = `sub-${Date.now()}@example.com`;
  const username = `sub${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  // Create a subscription product.
  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: "Subscription" }).click();
  await page.getByLabel("Title").fill("VIP Membership");
  await page.getByLabel("Description").fill("Monthly perks and support.");
  await page.getByLabel("Price (INR)").fill("299");
  await page.getByRole("button", { name: /create subscription/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();
  await expect(page.getByText("Subscribers", { exact: true })).toBeVisible();
  await expect(page.getByText("No subscribers yet.")).toBeVisible();

  // Buyer subscribes.
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/vip-membership`);
  await expect(buyerPage.getByText("₹299")).toBeVisible();
  await buyerPage.getByRole("link", { name: /^subscribe$/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/vip-membership/checkout$`));

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^subscribe/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock-subscription\//);
  await expect(buyerPage.getByText("Test subscription", { exact: true })).toBeVisible();
  await buyerPage.getByRole("button", { name: /simulate successful subscription/i }).click();
  await buyerPage.waitForURL(/\/member\//);

  await expect(buyerPage.getByRole("heading", { name: "VIP Membership" })).toBeVisible();
  await expect(buyerPage.getByText("Active", { exact: true })).toBeVisible();

  // Simulate a renewal and confirm the creator's order/customer records reflect it.
  await buyerPage.getByRole("button", { name: /simulate renewal/i }).click();
  await expect(buyerPage.getByText("Renewal simulated.")).toBeVisible();

  // Member cancels their own subscription — the app confirms via window.confirm().
  buyerPage.once("dialog", (dialog) => dialog.accept());
  await buyerPage.getByRole("button", { name: /^cancel subscription$/i }).click();
  await expect(buyerPage.getByText("Subscription cancelled.")).toBeVisible();
  await expect(buyerPage.getByText("Cancelled", { exact: true })).toBeVisible();
  await buyerContext.close();

  // Creator sees the subscriber, two paid billing cycles, and the customer's spend.
  await page.goto(`/dashboard/products`);
  await expect(page.getByText("1 subscriber")).toBeVisible();

  await page.goto("/dashboard/orders");
  const rows = page.getByRole("row", { name: new RegExp(buyerEmail) });
  await expect(rows).toHaveCount(2);

  await page.goto("/dashboard/customers");
  await expect(page.getByRole("cell", { name: buyerEmail, exact: true })).toBeVisible();
  await expect(page.getByText("₹598")).toBeVisible();
});
