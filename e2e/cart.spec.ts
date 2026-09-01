import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("buyer can add multiple products to a cart from one creator and check out in one order", async ({
  page,
  browser,
}) => {
  const email = `cart-${Date.now()}@example.com`;
  const username = `cart${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  // A digital product.
  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Ebook");
  await page.getByLabel("Price (INR)").fill("199");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  // A physical product with limited stock and a shipping fee, exercising
  // phase 1 (shipping fee) together with the cart.
  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: /^Physical/ }).click();
  await page.getByLabel("Title").fill("Enamel Pin Set");
  await page.getByLabel("Price (INR)").fill("399");
  await page.getByLabel("Stock (optional)").fill("5");
  await page.getByLabel("Shipping fee (optional)").fill("49");
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();

  await buyerPage.goto(`/${username}/ebook`);
  await buyerPage.getByRole("button", { name: /add to cart/i }).click();

  await buyerPage.goto(`/${username}/enamel-pin-set`);
  await buyerPage.getByRole("button", { name: /add to cart/i }).click();

  // Cart badge reflects both lines.
  await expect(buyerPage.getByRole("link", { name: "2" })).toBeVisible();

  await buyerPage.goto(`/${username}/cart`);
  await expect(buyerPage.getByText("Ebook")).toBeVisible();
  await expect(buyerPage.getByText("Enamel Pin Set")).toBeVisible();

  // Bump the physical item's quantity to 2 and confirm totals update.
  await buyerPage.getByRole("button", { name: "Increase quantity of Enamel Pin Set" }).click();
  await expect(buyerPage.getByText("₹1,046")).toBeVisible(); // 199 + 399*2 + 49 shipping

  await buyerPage.getByRole("link", { name: /^checkout$/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/checkout$`));

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
  await expect(buyerPage.getByText("Ebook + 1 more")).toBeVisible();
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();

  await buyerPage.waitForURL(/\/order\//);
  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  await expect(buyerPage.getByText("1x Ebook")).toBeVisible();
  await expect(buyerPage.getByText("2x Enamel Pin Set")).toBeVisible();
  await expect(buyerPage.getByText("Shipping", { exact: true })).toBeVisible();
  await expect(buyerPage.getByText("Shipping to")).toBeVisible();
  await expect(buyerPage.getByText("221B Baker Street")).toBeVisible();

  const downloadLink = buyerPage.getByRole("link", { name: /sample-product\.txt/i });
  await expect(downloadLink).toBeVisible();
  const downloadHref = await downloadLink.getAttribute("href");
  const downloadResponse = await buyerPage.request.get(downloadHref!);
  expect(downloadResponse.status()).toBe(200);

  // Cart cleared after a paid order.
  await buyerPage.goto(`/${username}`);
  await expect(buyerPage.getByRole("link", { name: "2" })).not.toBeVisible();

  await buyerContext.close();

  // Stock was 5, 2 were sold — the physical product should show 3 left.
  await page.goto(`/${username}/enamel-pin-set`);
  await expect(page.getByText("3 left")).toBeVisible();
});
