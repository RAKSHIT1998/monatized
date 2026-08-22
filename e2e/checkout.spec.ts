import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("buyer can complete a mock checkout and download the file, creator sees the order", async ({
  page,
  browser,
}) => {
  const email = `checkout-${Date.now()}@example.com`;
  const username = `buy${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Ebook");
  await page.getByLabel("Price (INR)").fill("199");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  // Buyer flow in a separate browser context — an anonymous, unauthenticated visitor.
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();

  await buyerPage.goto(`/${username}/ebook`);
  await buyerPage.getByRole("link", { name: /buy now/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/ebook/checkout$`));

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();

  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await expect(buyerPage.getByText("Test payment", { exact: true })).toBeVisible();
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();

  await buyerPage.waitForURL(/\/order\//);
  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();

  const downloadLink = buyerPage.getByRole("link", { name: /sample-product\.txt/i });
  await expect(downloadLink).toBeVisible();
  const downloadHref = await downloadLink.getAttribute("href");
  expect(downloadHref).toMatch(/^\/api\/download\//);

  const downloadResponse = await buyerPage.request.get(downloadHref!);
  expect(downloadResponse.status()).toBe(200);
  const body = await downloadResponse.text();
  expect(body).toContain("sample digital product file");

  await buyerContext.close();

  // Back in the creator's session: the order and customer should now be visible.
  await page.goto("/dashboard/orders");
  await expect(page.getByText(buyerEmail)).toBeVisible();
  await expect(page.getByText("PAID")).toBeVisible();

  await page.goto("/dashboard/customers");
  await expect(page.getByRole("cell", { name: buyerEmail, exact: true })).toBeVisible();
  await expect(page.getByText("₹199")).toBeVisible();
});
