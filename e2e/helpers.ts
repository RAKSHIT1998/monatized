import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";

export async function signupAndOnboard(
  page: Page,
  opts: { name?: string; email: string; password?: string; username: string },
) {
  const { name = "Test Creator", email, password = "correct-horse-battery", username } = opts;

  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create free store/i }).click();
  await page.waitForURL(/\/onboarding/);

  await page.getByRole("checkbox", { name: "Digital products" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByLabel("Store URL").fill(username);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByRole("button", { name: /launch my store/i }).click();
  await page.waitForURL(/\/dashboard$/);
}

// Moves a creator to the Pro plan directly in the DB — used by specs for
// Pro-gated features (Automations, Custom domain, Growth engine), since
// there's no self-serve upgrade flow to exercise instead.
export function upgradeToPro(username: string) {
  execFileSync(
    process.execPath,
    [require.resolve("tsx/cli"), path.join(__dirname, "fixtures", "upgrade-to-pro.ts"), username],
    { stdio: "inherit" },
  );
}
