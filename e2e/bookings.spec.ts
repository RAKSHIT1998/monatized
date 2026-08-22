import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can offer bookable sessions and a buyer can book and cancel one", async ({
  page,
  browser,
}) => {
  const email = `booking-${Date.now()}@example.com`;
  const username = `bk${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: "Booking" }).click();
  await page.getByLabel("Title").fill("1:1 Strategy Call");
  await page.getByLabel("Description").fill("A focused 30-minute session.");
  await page.getByLabel("Price (INR)").fill("999");
  await page.getByRole("button", { name: /create booking type/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  // Availability rule covering every day of the week so the test is stable regardless of today.
  for (let day = 0; day <= 6; day++) {
    await page.getByLabel("Day").selectOption(String(day));
    await page.getByLabel("From (UTC)").fill("00:00");
    await page.getByLabel("To (UTC)").fill("23:30");
    await page.getByRole("button", { name: "Add window" }).click();
    await expect(page.getByText(`00:00–23:30 UTC`).first()).toBeVisible();
  }

  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();
  await expect(page.getByText("No bookings yet.")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/1-1-strategy-call`);
  await expect(buyerPage.getByText("₹999")).toBeVisible();
  await buyerPage.getByRole("link", { name: /^book a time$/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/1-1-strategy-call/checkout$`));

  await expect(buyerPage.getByText("Pick a time")).toBeVisible();
  await buyerPage.locator("button", { hasText: /\d{1,2}:\d{2}\s?(AM|PM)/i }).first().click();

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  const bookingLink = buyerPage.getByRole("link", { name: /view or cancel this booking/i });
  await expect(bookingLink).toBeVisible();
  await bookingLink.click();
  await buyerPage.waitForURL(/\/booking\//);
  await expect(buyerPage.getByText("Confirmed", { exact: true })).toBeVisible();

  buyerPage.once("dialog", (dialog) => dialog.accept());
  await buyerPage.getByRole("button", { name: /^cancel booking$/i }).click();
  await expect(buyerPage.getByText("Booking cancelled.")).toBeVisible();
  await expect(buyerPage.getByText("Cancelled", { exact: true })).toBeVisible();
  await buyerContext.close();

  await page.goto(`/dashboard/products`);
  await expect(page.getByText("1 booking", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "1:1 Strategy Call" }).click();
  await expect(page.getByRole("cell", { name: buyerEmail })).toBeVisible();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
});
