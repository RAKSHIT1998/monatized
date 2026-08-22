import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("automation tags a customer automatically when their order is paid", async ({ page }) => {
  const email = `auto-${Date.now()}@example.com`;
  const username = `auto${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/automations");
  await page.getByLabel("When").selectOption("ORDER_PAID");
  await page.getByLabel("Then").selectOption("ADD_CUSTOMER_TAG");
  await page.getByLabel("Tag").fill("first-buyer");
  await page.getByRole("button", { name: /create automation/i }).click();
  await expect(page.getByText("Automation created.")).toBeVisible();
  await expect(page.getByText('Add tag "first-buyer"')).toBeVisible();

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Cheat Sheet");
  await page.getByLabel("Description").fill("A quick reference.");
  await page.getByLabel("Price (INR)").fill("50");
  await page.getByLabel("File customers receive").setInputFiles({
    name: "sheet.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("sheet"),
  });
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  await page.goto(`/${username}/cheat-sheet/checkout`);
  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(buyerEmail);
  await page.getByRole("button", { name: /^pay/i }).click();
  await page.waitForURL(/\/checkout\/mock\//);
  await page.getByRole("button", { name: /simulate successful payment/i }).click();
  await page.waitForURL(/\/order\//);

  await page.goto("/dashboard/customers");
  await expect(page.getByRole("cell", { name: buyerEmail, exact: true })).toBeVisible();
  await expect(page.getByText("first-buyer")).toBeVisible();

  await page.goto("/dashboard/automations");
  await expect(page.getByRole("row", { name: /Add tag "first-buyer"/ }).getByText("1")).toBeVisible();
});
