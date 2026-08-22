import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can add an affiliate and get credited when a referred buyer purchases", async ({
  page,
  browser,
}) => {
  const email = `aff-${Date.now()}@example.com`;
  const username = `aff${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Design Templates Pack");
  await page.getByLabel("Description").fill("50 editable templates.");
  await page.getByLabel("Price (INR)").fill("500");
  await page.getByLabel("File customers receive").setInputFiles({
    name: "templates.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("templates"),
  });
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const code = `PARTNER${Date.now()}`.slice(0, 15);
  await page.goto("/dashboard/affiliates");
  await page.getByLabel("Name").fill("Jamie Partner");
  await page.getByLabel("Email").fill("jamie@example.com");
  await page.getByLabel("Referral code").fill(code);
  await page.getByLabel("Commission %").fill("20");
  await page.getByRole("button", { name: /add affiliate/i }).click();
  await expect(page.getByText("Affiliate added.")).toBeVisible();
  await expect(page.getByText("Jamie Partner")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}?ref=${code}`);
  await buyerPage.getByRole("link", { name: "Design Templates Pack" }).click();
  await buyerPage.waitForURL(/\/design-templates-pack$/);
  await buyerPage.getByRole("link", { name: /^buy now$/i }).click();
  await buyerPage.waitForURL(/\/checkout$/);

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);
  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  await buyerContext.close();

  await page.goto("/dashboard/affiliates");
  const row = page.getByRole("row", { name: /Jamie Partner/ });
  await expect(row.getByRole("cell", { name: "1", exact: true })).toBeVisible();
  await expect(row.getByText("₹100")).toBeVisible(); // 20% of ₹500
});
