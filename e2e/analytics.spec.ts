import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("analytics page reflects a completed sale", async ({ page, browser }) => {
  const email = `analytics-${Date.now()}@example.com`;
  const username = `stats${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Preset Pack");
  await page.getByLabel("Price (INR)").fill("99");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/preset-pack`);
  await buyerPage.getByRole("link", { name: /buy now/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/preset-pack/checkout$`));
  await buyerPage.getByLabel("Email").fill(`buyer-${Date.now()}@example.com`);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);
  await buyerContext.close();

  await page.goto("/dashboard/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(page.getByText("Store views")).toBeVisible();
  await expect(page.getByText("Preset Pack")).toBeVisible();
  await expect(page.getByText("₹99")).toBeVisible();
});
