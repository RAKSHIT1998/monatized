import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can offer product options with their own stock, buyer picks one and checks out", async ({
  page,
  browser,
}) => {
  const email = `variants-${Date.now()}@example.com`;
  const username = `var${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: /^Physical/ }).click();
  await page.getByLabel("Title").fill("Enamel Pin Set");
  await page.getByLabel("Price (INR)").fill("399");
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  await page.getByLabel("Option name").fill("Red");
  await page.getByLabel("Option stock (optional)").fill("1");
  await page.getByRole("button", { name: /add option/i }).click();
  await expect(page.getByText("Option added.")).toBeVisible();

  await page.getByLabel("Option name").fill("Blue");
  await page.getByLabel("Option stock (optional)").fill("1");
  await page.getByRole("button", { name: /add option/i }).click();
  await expect(page.getByText("Option added.")).toBeVisible();

  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/enamel-pin-set`);

  // Both options are selectable and neither is sold out yet (each shows its
  // own "1 left" hint since stock is low but not zero).
  await expect(buyerPage.getByRole("button", { name: "Red" })).toBeEnabled();
  await expect(buyerPage.getByRole("button", { name: "Blue" })).toBeEnabled();

  // Add both options to the cart — this is the composite (productId,
  // variantId) key fix: two different variants of the same product must
  // become two distinct cart lines, not merge into one.
  await buyerPage.getByRole("button", { name: "Red" }).click();
  await buyerPage.getByRole("button", { name: /add to cart/i }).click();
  await buyerPage.getByRole("button", { name: "Blue" }).click();
  await buyerPage.getByRole("button", { name: /add to cart/i }).click();

  await buyerPage.goto(`/${username}/cart`);
  await expect(buyerPage.getByText("Enamel Pin Set — Red")).toBeVisible();
  await expect(buyerPage.getByText("Enamel Pin Set — Blue")).toBeVisible();
  // Two separate lines at quantity 1 each, not one merged line of 2.
  await expect(buyerPage.getByText("₹798").first()).toBeVisible(); // 399 * 2, two lines

  await buyerPage.getByRole("link", { name: /^checkout$/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/checkout$`));
  await expect(buyerPage.getByText("1x Enamel Pin Set — Red")).toBeVisible();
  await expect(buyerPage.getByText("1x Enamel Pin Set — Blue")).toBeVisible();

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Full name").fill("Priya Sharma");
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByLabel("Address line 1").fill("221B Baker Street");
  await buyerPage.getByLabel("City").fill("Mumbai");
  await buyerPage.getByLabel("State").fill("Maharashtra");
  await buyerPage.getByLabel("Postal code").fill("400001");
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  await expect(buyerPage.getByText("1x Enamel Pin Set — Red")).toBeVisible();
  await expect(buyerPage.getByText("1x Enamel Pin Set — Blue")).toBeVisible();

  await buyerContext.close();

  // Both variants' stock (1 each) is now exhausted — the whole product
  // should read as sold out, and each option should show it individually.
  await page.goto(`/${username}/enamel-pin-set`);
  await expect(page.getByText("Sold out").first()).toBeVisible();
});
