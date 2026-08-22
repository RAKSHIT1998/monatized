import { test, expect } from "@playwright/test";
import { signupAndOnboard } from "./helpers";

test("creator can build a course, publish it, and a buyer can learn and track progress", async ({
  page,
  browser,
}) => {
  const email = `course-${Date.now()}@example.com`;
  const username = `course${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });

  // Create a course product (no file required).
  await page.goto("/dashboard/products/new");
  await page.getByRole("button", { name: "Course" }).click();
  await page.getByLabel("Title").fill("Video Editing Basics");
  await page.getByLabel("Price (INR)").fill("999");
  await page.getByRole("button", { name: /create course/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);

  // Add a module.
  await page.getByPlaceholder("Module title, e.g. Getting started").fill("Module 1: Basics");
  await page.getByRole("button", { name: /^add module$/i }).click();
  await expect(page.getByText("Module 1: Basics")).toBeVisible();

  // Add a text lesson.
  await page.getByRole("button", { name: /add lesson/i }).click();
  const dialog1 = page.getByRole("dialog").last();
  await dialog1.getByLabel("Title").fill("Welcome");
  await dialog1.getByLabel("Content").fill("Welcome to the course! Here's what you'll learn.");
  await dialog1.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText("Lesson added.")).toBeVisible();
  await expect(dialog1).not.toBeVisible();

  // Add a video lesson.
  await page.getByRole("button", { name: /add lesson/i }).click();
  const dialog2 = page.getByRole("dialog").last();
  await dialog2.getByLabel("Title").fill("Intro video");
  await dialog2.getByLabel("Type").selectOption("VIDEO");
  await dialog2.getByLabel("Embed URL").fill("https://www.youtube.com/embed/dQw4w9WgXcQ");
  await dialog2.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText("Lesson added.")).toBeVisible();

  await expect(page.getByText("Welcome")).toBeVisible();
  await expect(page.getByText("Intro video")).toBeVisible();

  // Publish requires at least one lesson — it exists now.
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  // Buyer purchases the course.
  const buyerContext = await browser.newContext();
  const buyerPage = await buyerContext.newPage();
  await buyerPage.goto(`/${username}/video-editing-basics`);
  await expect(buyerPage.getByText("Module 1: Basics")).toBeVisible();
  await expect(buyerPage.getByText("Welcome")).toBeVisible();

  await buyerPage.getByRole("link", { name: /buy now/i }).click();
  await buyerPage.waitForURL(new RegExp(`/${username}/video-editing-basics/checkout$`));
  await buyerPage.getByLabel("Email").fill(`buyer-${Date.now()}@example.com`);
  await buyerPage.getByRole("button", { name: /^pay/i }).click();
  await buyerPage.waitForURL(/\/checkout\/mock\//);
  await buyerPage.getByRole("button", { name: /simulate successful payment/i }).click();
  await buyerPage.waitForURL(/\/order\//);

  await expect(buyerPage.getByText("Thank you for your purchase!")).toBeVisible();
  const learnLink = buyerPage.getByRole("link", { name: /start learning/i });
  await expect(learnLink).toBeVisible();
  const learnHref = await learnLink.getAttribute("href");
  expect(learnHref).toMatch(/^\/learn\//);

  await buyerPage.goto(learnHref!);
  await expect(buyerPage.getByRole("heading", { name: "Video Editing Basics" })).toBeVisible();
  await expect(buyerPage.getByText("0 of 2 lessons complete")).toBeVisible();

  await buyerPage.getByRole("button", { name: /mark complete/i }).click();
  await expect(buyerPage.getByText("1 of 2 lessons complete")).toBeVisible();

  await buyerPage.getByRole("button", { name: /^next$/i }).click();
  await expect(buyerPage.getByRole("heading", { name: "Intro video" })).toBeVisible();

  await buyerContext.close();
});
