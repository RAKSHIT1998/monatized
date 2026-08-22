import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("creator can tag and search customers", async ({ page, browser }) => {
  const email = `crm-${Date.now()}@example.com`;
  const username = `crm${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Ebook");
  await page.getByLabel("Price (INR)").fill("199");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/ebook`);
  await buyerPage.getByRole("link", { name: /buy now/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/ebook/checkout$`));
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);
  await buyerContext.close();

  await page.goto("/dashboard/customers");
  await page.getByRole("button", { name: `Edit ${buyerEmail}` }).click();

  await expect(page.getByText("Tags and notes are only visible to you.")).toBeVisible();
  await page.getByLabel("Tags (comma separated)").fill("vip, repeat");
  await page.getByLabel("Notes").fill("Asked about a bundle discount.");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText("Customer updated.")).toBeVisible();

  await expect(page.getByText("vip")).toBeVisible();
  await expect(page.getByText("repeat")).toBeVisible();

  await page.getByPlaceholder("Search by email, name, or tag…").fill("vip");
  await expect(page.getByRole("cell", { name: buyerEmail, exact: true })).toBeVisible();

  await page.getByPlaceholder("Search by email, name, or tag…").fill("no-such-tag");
  await expect(page.getByText(/no customers match/i)).toBeVisible();
});
