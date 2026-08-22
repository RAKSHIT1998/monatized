import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can post members-only content and a subscriber can read and comment", async ({
  page,
  browser,
}) => {
  const email = `community-${Date.now()}@example.com`;
  const username = `cm${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  // Create + publish a subscription so there's an active member to gate against.
  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: "Subscription" }).click();
  await page.getByLabel("Title").fill("Inner Circle");
  await page.getByLabel("Description").fill("Behind-the-scenes updates.");
  await page.getByLabel("Price (INR)").fill("199");
  await page.getByRole("button", { name: /create subscription/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  await page.goto("/dashboard/community");
  await page.getByLabel("Title").fill("Welcome to the inner circle");
  await page.getByLabel("Post").fill("Glad to have you here — more soon.");
  await page.getByRole("button", { name: /publish post/i }).click();
  await expect(page.getByText("Post published.")).toBeVisible();
  await expect(page.getByText("Welcome to the inner circle")).toBeVisible();

  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/inner-circle`);
  await buyerPage.getByRole("link", { name: /^subscribe$/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/inner-circle/checkout$`));
  const buyerEmail = `buyer-${Date.now()}@example.com`;
  await buyerPage.getByLabel("Email").fill(buyerEmail);
  await buyerPage.getByRole("button", { name: /^subscribe/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock-subscription\//);
  await buyerPage.getByRole("button", { name: /simulate successful subscription/i }).click();
  await buyerPage.waitForURL(/\/member\//);

  await buyerPage.getByRole("link", { name: /community/i }).click();
  await buyerPage.waitForURL(/\/community$/);
  await expect(buyerPage.getByText("Welcome to the inner circle")).toBeVisible();

  await buyerPage.getByPlaceholder("Leave a comment…").fill("Excited to be here!");
  await buyerPage.getByRole("button", { name: "Post" }).click();
  await expect(buyerPage.getByText("Excited to be here!")).toBeVisible();
  await buyerContext.close();

  // Creator sees and can reply to the member's comment.
  await page.goto("/dashboard/community");
  await expect(page.getByText("Excited to be here!")).toBeVisible();
  await page.getByPlaceholder("Reply as yourself…").fill("Thanks for joining!");
  await page.getByRole("button", { name: "Reply" }).click();
  await expect(page.getByText("Thanks for joining!")).toBeVisible();
});
