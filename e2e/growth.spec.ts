import { test, expect } from "@playwright/test";
import { signupAndOnboard, upgradeToPro } from "./helpers";

test("creator sees growth insights and can generate a product description", async ({ page }) => {
  const email = `growth-${Date.now()}@example.com`;
  const username = `gr${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });
  upgradeToPro(username); // Growth engine is a Pro-plan feature

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Notion Template");
  await page.getByLabel("Description").fill("placeholder");
  await page.getByLabel("Price (INR)").fill("299");
  await page.getByLabel("File customers receive").setInputFiles({
    name: "template.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("template"),
  });
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  await page.goto("/dashboard/growth");
  await expect(page.getByText("built-in templates (no AI key set)")).toBeVisible();
  await expect(page.getByText("No active coupons")).toBeVisible();

  await page.getByRole("combobox").selectOption({ label: "Notion Template" });
  await page.getByRole("button", { name: /generate description/i }).click();
  const descriptionTextarea = page.locator("textarea");
  await expect(descriptionTextarea).toHaveValue(/Notion Template/, { timeout: 15_000 });

  await page.getByRole("button", { name: /save to product/i }).click();
  await expect(page.getByText("Saved to product.")).toBeVisible();

  await page.goto(`/${username}/notion-template`);
  await expect(page.getByText(/for just ₹299/i)).toBeVisible();
});
