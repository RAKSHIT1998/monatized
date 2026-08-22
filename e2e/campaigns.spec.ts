import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can draft and send an email campaign to all customers", async ({ page }) => {
  const email = `camp-${Date.now()}@example.com`;
  const username = `camp${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  // Create a customer by making a free-ish digital product purchase isn't needed —
  // customers only exist after a checkout, so create+publish a product and buy it.
  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Icon Pack");
  await page.getByLabel("Description").fill("200 icons.");
  await page.getByLabel("Price (INR)").fill("100");
  await page.getByLabel("File customers receive").setInputFiles({
    name: "icons.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("icons"),
  });
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  await page.goto(`/${username}/icon-pack/checkout`);
  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(buyerEmail);
  await page.getByRole("button", { name: /^pay/i }).click();
  await page.waitForURL(/\/checkout\/mock\//);
  await page.getByRole("button", { name: /simulate successful payment/i }).click();
  await page.waitForURL(/\/order\//);

  await page.goto("/dashboard/campaigns");
  await expect(page.getByText(/console \(dev-only\)/i)).toBeVisible();
  await page.getByLabel("Subject").fill("Thanks for your support");
  await page.getByLabel("Message").fill("Here's what's new.");
  await page.getByRole("button", { name: /save draft/i }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();
  await expect(page.getByText("Thanks for your support")).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /send now/i }).click();
  await expect(page.getByText("Campaign sent.")).toBeVisible();
  await expect(page.getByText("SENT", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "1", exact: true })).toBeVisible();
});
