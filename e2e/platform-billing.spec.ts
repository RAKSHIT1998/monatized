import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can pay to upgrade their own plan, and downgrades on cancellation", async ({ page }) => {
  const email = `platbill-${Date.now()}@example.com`;
  const username = `platbill${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  // Free plan: Automations is locked.
  await page.goto("/dashboard/automations");
  await expect(page.getByText("Automations is a Pro plan feature")).toBeVisible();

  // Upgrade to Pro via the mock plan checkout.
  await page.goto("/dashboard/billing");
  await page.getByRole("button", { name: /^upgrade to pro$/i }).click();
  await page.waitForURL(/\/checkout\/mock-platform-subscription\//);
  await expect(page.getByText("Pro plan")).toBeVisible();
  await expect(page.getByText("₹1,499")).toBeVisible();
  await page.getByRole("button", { name: /simulate successful payment/i }).click();
  await page.waitForURL(/\/dashboard\/billing$/);

  // Now on Pro: shows as current, and Automations unlocks.
  const proCard = page.locator('[data-slot="card"]', { hasText: "Pro" }).first();
  await expect(proCard.getByText("Current")).toBeVisible();
  await expect(page.getByText(/^Renews /)).toBeVisible();
  await page.goto("/dashboard/automations");
  await expect(page.getByText("Simple rules that run automatically")).toBeVisible();

  // Mock dev controls: simulate a renewal charge with no errors.
  await page.goto("/dashboard/billing");
  await page.getByRole("button", { name: /simulate renewal/i }).click();
  await expect(page.getByText("Simulated a renewal charge.")).toBeVisible();

  // Cancelling a MOCK plan downgrades immediately (no external billing to
  // gracefully wind down) — back to Free, and Automations re-locks.
  await page.getByRole("button", { name: /^cancel plan$/i }).click();
  await expect(page.getByText("Downgraded to Free.")).toBeVisible();
  await page.reload();
  const freeCard = page.locator('[data-slot="card"]', { hasText: "Free" }).first();
  await expect(freeCard.getByText("Current")).toBeVisible();
  await page.goto("/dashboard/automations");
  await expect(page.getByText("Automations is a Pro plan feature")).toBeVisible();
});

test("switching between paid plans prorates the unused time on the old one", async ({ page }) => {
  const email = `proration-${Date.now()}@example.com`;
  const username = `proration${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  // Upgrade to Pro first, same mock-checkout flow as above.
  await page.goto("/dashboard/billing");
  await page.getByRole("button", { name: /^upgrade to pro$/i }).click();
  await page.waitForURL(/\/checkout\/mock-platform-subscription\//);
  await page.getByRole("button", { name: /simulate successful payment/i }).click();
  await page.waitForURL(/\/dashboard\/billing$/);

  // Switching to Business immediately after credits nearly all of Pro's
  // unused month — the checkout page should show that credit and a "due
  // today" figure below Business's ₹4,999 full price. The exact amount
  // depends on real elapsed wall-clock time, so only the discount's
  // presence is asserted, not a precise number.
  await page.getByRole("button", { name: /^upgrade to business$/i }).click();
  await page.waitForURL(/\/checkout\/mock-platform-subscription\//);
  await expect(page.getByText("Business plan")).toBeVisible();
  await expect(page.getByText("Credit for unused time on your current plan")).toBeVisible();
  const dueRow = page.locator("div", { hasText: "Due today" }).last();
  await expect(dueRow).toBeVisible();
  await expect(dueRow).not.toContainText("₹4,999");
  await page.getByRole("button", { name: /simulate successful payment/i }).click();
  await page.waitForURL(/\/dashboard\/billing$/);
  const businessCard = page.locator('[data-slot="card"]', { hasText: "Business" }).first();
  await expect(businessCard.getByText("Current")).toBeVisible();

  // Business was just activated, so almost its entire ₹4,999 is still
  // unused — comfortably more than Creator's ₹499, so the credit fully
  // covers it and the switch activates instantly with no checkout hop.
  await page.getByRole("button", { name: /^upgrade to creator$/i }).click();
  await page.waitForURL(/\/dashboard\/billing$/);
  const creatorCard = page.locator('[data-slot="card"]', { hasText: "Creator" }).first();
  await expect(creatorCard.getByText("Current")).toBeVisible();
});
