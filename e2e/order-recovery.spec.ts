import path from "node:path";
import { test, expect } from "@playwright/test";
import { signupAndOnboard, readEmailLogCount } from "./helpers";

const FIXTURE_FILE = path.join(__dirname, "fixtures", "sample-product.txt");

test("a buyer who lost their order link can recover it by email, with no enumeration", async ({
  page,
  browser,
}) => {
  const email = `recoverycreator-${Date.now()}@example.com`;
  const username = `recov${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Ebook");
  await page.getByLabel("Price (INR)").fill("199");
  await page.locator('input[name="file"]').setInputFiles(FIXTURE_FILE);
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  const buyerEmail = `recoverybuyer-${Date.now()}@example.com`;

  await buyerPage.goto(`/${username}/ebook`);
  await buyerPage.getByRole("link", { name: /buy now/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/ebook/checkout$`));
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  expect(readEmailLogCount(buyerEmail)).toBe(1); // the order confirmation email

  // Buyer "loses" the link and uses Find my order instead.
  await buyerPage.goto("/find-order");
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /send me my orders/i }).click();
  await expect(
    buyerPage.getByText("If we found any orders for that email, we've sent the links to view them."),
  ).toBeVisible();
  expect(readEmailLogCount(buyerEmail)).toBe(2); // confirmation + recovery

  // An email with no orders gets the exact same message — no enumeration —
  // and genuinely sends nothing.
  const strangerEmail = `nobody-${Date.now()}@example.com`;
  await buyerPage.goto("/find-order");
  await buyerPage.getByLabel("Email").fill(strangerEmail);
  await buyerPage.getByRole("button", { name: /send me my orders/i }).click();
  await expect(
    buyerPage.getByText("If we found any orders for that email, we've sent the links to view them."),
  ).toBeVisible();
  expect(readEmailLogCount(strangerEmail)).toBe(0);

  await buyerContext.close();
});
