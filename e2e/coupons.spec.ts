import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("creator can create a coupon and a buyer can redeem it at checkout", async ({
  page,
  browser,
}) => {
  const email = `coupon-${Date.now()}@example.com`;
  const username = `coup${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Video Course");
  await page.getByLabel("Price (INR)").fill("1000");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  await page.goto("/dashboard/coupons");
  await page.getByLabel("Code").fill("save10");
  await page.getByLabel("Value").fill("10");
  await page.getByRole("button", { name: /create coupon/i }).click();
  await expect(page.getByText("Coupon created.")).toBeVisible();
  await expect(page.getByText("SAVE10")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/video-course`);
  await buyerPage.getByRole("link", { name: /buy now/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/video-course/checkout$`));

  await buyerPage.getByPlaceholder("LAUNCH20").fill("save10");
  await buyerPage.getByRole("button", { name: /^apply$/i }).click();
  await expect(buyerPage.getByText(/you save ₹100/i)).toBeVisible();
  await expect(buyerPage.getByRole("button", { name: /pay ₹900/i })).toBeVisible();

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /pay ₹900/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  await expect(buyerPage.getByText("Coupon SAVE10")).toBeVisible();
  await buyerContext.close();

  await page.goto("/dashboard/coupons");
  const couponRow = page.locator("tr", { hasText: "SAVE10" });
  await expect(couponRow).toContainText("1");
});
