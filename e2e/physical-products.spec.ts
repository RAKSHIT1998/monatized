import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can sell a physical product with limited stock, and a buyer ships to an address", async ({
  page,
  browser,
}) => {
  const email = `physical-${Date.now()}@example.com`;
  const username = `phys${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: /^Physical/ }).click();
  await page.getByLabel("Title").fill("Enamel Pin Set");
  await page.getByLabel("Description").fill("A set of 3 enamel pins.");
  await page.getByLabel("Price (INR)").fill("399");
  await page.getByLabel("Stock (optional)").fill("1");
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/enamel-pin-set`);
  await expect(buyerPage.getByText("₹399")).toBeVisible();
  await expect(buyerPage.getByText("Only 1 left")).toBeVisible();

  await buyerPage.getByRole("link", { name: /^buy now$/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/enamel-pin-set/checkout$`));

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Full name").fill("Priya Sharma");
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByLabel("Address line 1").fill("221B Baker Street");
  await buyerPage.getByLabel("City").fill("Mumbai");
  await buyerPage.getByLabel("State").fill("Maharashtra");
  await buyerPage.getByLabel("Postal code").fill("400001");
  await buyerPage.getByLabel("Country").fill("India");
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  await expect(buyerPage.getByText("Shipping to")).toBeVisible();
  await expect(buyerPage.getByText("221B Baker Street")).toBeVisible();
  await buyerContext.close();

  // Stock was 1 and just sold — the listing should now refuse further sales.
  await page.goto(`/${username}/enamel-pin-set`);
  await expect(page.getByText("Sold out").first()).toBeVisible();

  await page.goto("/dashboard/orders");
  const shipButton = page.getByRole("button", { name: /mark shipped/i });
  await shipButton.click();
  await page.getByPlaceholder("Tracking number (optional)").fill("IN123456789");
  await page.getByRole("dialog").getByRole("button", { name: /mark shipped/i }).click();
  await expect(page.getByText("Marked as shipped.")).toBeVisible();
  await expect(page.getByText("Shipped", { exact: true })).toBeVisible();
  await expect(page.getByText("IN123456789")).toBeVisible();
});
