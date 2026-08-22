import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("published product appears on the public storefront and product page", async ({ page }) => {
  const email = `storefront-${Date.now()}@example.com`;
  const username = `store${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Fitness Guide");
  await page.getByLabel("Description").fill("Everything you need to get fit.");
  await page.getByLabel("Price (INR)").fill("299");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  await page.goto(`/${username}`);
  await expect(page.getByRole("heading", { name: "Test Creator" })).toBeVisible();
  await expect(page.getByText("Fitness Guide")).toBeVisible();
  await expect(page.getByText("₹299")).toBeVisible();
  await expect(page.getByText("Powered by Monetized")).toBeVisible();

  await page.getByText("Fitness Guide").click();
  await page.waitForURL(new RegExp(`/${username}/fitness-guide$`));
  await expect(page.getByRole("heading", { name: "Fitness Guide" })).toBeVisible();
  await expect(page.getByText("Everything you need to get fit.")).toBeVisible();

  const buyButtonHref = await page.getByRole("link", { name: /buy now/i }).getAttribute("href");
  expect(buyButtonHref).toBe(`/${username}/fitness-guide/checkout`);
});
