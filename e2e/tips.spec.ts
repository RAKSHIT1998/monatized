import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can set up a tip jar and a supporter can give a custom amount with a message", async ({
  page,
  browser,
}) => {
  const email = `tips-${Date.now()}@example.com`;
  const username = `tips${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: /^Tip jar/ }).click();
  await page.getByLabel("Title").fill("Buy me a coffee");
  await page.getByLabel("Description").fill("If you liked what I make, toss a coffee my way.");
  await page.getByLabel("Suggested amount (INR)").fill("100");
  await page.getByRole("button", { name: /create tip jar/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();
  await expect(page.getByText("No tips yet.")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/buy-me-a-coffee`);
  await expect(buyerPage.getByText("From ₹100")).toBeVisible();

  await buyerPage.getByRole("link", { name: /^give a tip$/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/buy-me-a-coffee/checkout$`));

  await expect(buyerPage.getByRole("button", { name: "₹100", exact: true })).toBeVisible();
  await buyerPage.getByRole("button", { name: "Custom" }).click();
  await buyerPage.getByPlaceholder("Enter an amount").fill("250");

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByLabel("Leave a message (optional)").fill("Love your work! Keep it up.");
  await buyerPage.getByRole("button", { name: /^give ₹250$/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  await expect(buyerPage.getByText("₹250", { exact: true }).first()).toBeVisible();
  await expect(buyerPage.getByText("Thank you for the support")).toBeVisible();
  await buyerContext.close();

  await page.goto("/dashboard/products");
  await page.getByRole("link", { name: "Buy me a coffee" }).click();
  await expect(page.getByText("Tips received")).toBeVisible();
  await expect(page.getByText(buyerEmail)).toBeVisible();
  await expect(page.getByText("Love your work! Keep it up.")).toBeVisible();
});
