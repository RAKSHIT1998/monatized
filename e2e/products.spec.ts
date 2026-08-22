import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("creator can create a digital product, add a file, and publish it", async ({ page }) => {
  const email = `products-${Date.now()}@example.com`;
  const username = `prod${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("30-Day Fitness Plan");
  await page.getByLabel("Description").fill("A complete plan to get you started.");
  await page.getByLabel("Price (INR)").fill("499");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();

  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "30-Day Fitness Plan" })).toBeVisible();
  await expect(page.getByText("sample-product.txt")).toBeVisible();
  await expect(page.getByText("DRAFT")).toBeVisible();

  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  await page.goto("/dashboard/products");
  await expect(page.getByRole("link", { name: "30-Day Fitness Plan" })).toBeVisible();
});
