import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("creator can refund a paid order, which expires the download link and reverses customer spend", async ({
  page,
  browser,
}) => {
  const email = `refund-${Date.now()}@example.com`;
  const username = `rfd${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Refundable Ebook");
  await page.getByLabel("Price (INR)").fill("499");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/refundable-ebook`);
  await buyerPage.getByRole("link", { name: /buy now/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/refundable-ebook/checkout$`));

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  const downloadHref = await buyerPage
    .getByRole("link", { name: /sample-product\.txt/i })
    .getAttribute("href");

  // The download works before any refund.
  const beforeRefund = await buyerPage.request.get(downloadHref!);
  expect(beforeRefund.status()).toBe(200);

  await page.goto("/dashboard/customers");
  await expect(page.getByText("₹499")).toBeVisible();

  await page.goto("/dashboard/orders");
  await page.getByRole("button", { name: /^refund$/i }).click();
  await expect(page.getByText(/refunds ₹499.*can't be undone/i)).toBeVisible();
  await page.getByRole("button", { name: /^refund order$/i }).click();
  await expect(page.getByText("Order refunded.")).toBeVisible();
  await expect(page.getByText("REFUNDED", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^refund$/i })).not.toBeVisible();

  // Refunded money is no longer counted as spent.
  await page.goto("/dashboard/customers");
  await expect(page.getByText("₹0")).toBeVisible();

  // The download link is expired, not just still-technically-alive.
  const afterRefund = await buyerPage.request.get(downloadHref!);
  expect(afterRefund.status()).toBe(410);

  await buyerContext.close();
});
