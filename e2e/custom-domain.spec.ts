import path from "node:path";
import { execFileSync } from "node:child_process";
import { test, expect, chromium } from "@playwright/test";
import { signupAndOnboard, upgradeToPro } from "./helpers";

const APP_PORT = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3002").port || "3002";

// Chromium treats "Host" as a protected header and won't let extraHTTPHeaders
// or route interception override it — the standard way to simulate a second
// hostname hitting the same server is a DNS-resolution override instead,
// mapping the fake domain to 127.0.0.1 and then navigating to a genuinely
// absolute http://<domain>:<port> URL, so Chromium sets the real Host header
// itself as part of an ordinary request.
async function launchAsHost(domain: string) {
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${domain} 127.0.0.1`],
  });
  const page = await browser.newPage();
  return { browser, page };
}

// Only the second test below reaches into the DB directly — see its comment
// for why that's justified here. Shelled out via `tsx` (the same mechanism
// prisma/seed.ts already uses) rather than imported in-process, since
// src/lib/db.ts starts with `import "server-only"`, which throws
// unconditionally outside Next's own bundler.
function markDomainVerified(domain: string) {
  execFileSync(
    process.execPath,
    [require.resolve("tsx/cli"), path.join(__dirname, "fixtures", "mark-domain-verified.ts"), domain],
    { stdio: "inherit" },
  );
}

// This sandbox has no real DNS server to publish a TXT record on, so this
// test exercises what's actually achievable: connecting a domain, and a real
// (not mocked) DNS lookup correctly reporting "not verified yet" for a domain
// that genuinely has no such record — never a faked "verified" success.
test("creator can connect a custom domain and see an honest pending/failed verification result", async ({
  page,
}) => {
  const email = `domain-${Date.now()}@example.com`;
  const username = `dom${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });
  upgradeToPro(username); // Custom domains is a Pro-plan feature

  const domain = `${username}.example.test`;
  await page.goto("/dashboard/domain");
  await page.getByLabel("Domain").fill(domain);
  await page.getByRole("button", { name: /connect domain/i }).click();
  await expect(page.getByText(domain, { exact: true })).toBeVisible();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await expect(page.getByText("_monetized-verify")).toBeVisible();

  await page.getByRole("button", { name: /^verify$/i }).click();
  await expect(page.getByText(/DNS can take a few minutes/i)).toBeVisible();
  await expect(page.getByText("Not verified", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /disconnect/i }).click();
  await expect(page.getByText("Domain disconnected.")).toBeVisible();
  await expect(page.getByRole("button", { name: /connect domain/i })).toBeVisible();
});

// This test reaches directly into the database to flip a domain to VERIFIED —
// the one deliberate exception to this suite's "only drive the app through
// its own UI/actions" rule, because there's no real DNS in this sandbox to
// earn that status honestly. It exists specifically to prove the routing
// mechanism actually works end to end (proxy.ts's host rewrite → src/app/sites
// resolving the domain → rendering the real storefront/product pages) — a
// bug here (an internal folder named so Next.js silently excluded it from
// routing) shipped past every other check in this project except a full
// `next build`, so this gap is worth covering for real with a genuinely
// second hostname rather than only unit-testing the pieces in isolation.
test("a verified custom domain serves the creator's real storefront and product pages", async ({
  page,
}) => {
  const email = `domain2-${Date.now()}@example.com`;
  const username = `dom2${Date.now()}`.slice(0, 20);
  await signupAndOnboard(page, { email, username });
  upgradeToPro(username); // Custom domains is a Pro-plan feature

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Title").fill("Domain Test Product");
  await page.getByLabel("Description").fill("Proves custom-domain routing works.");
  await page.getByLabel("Price (INR)").fill("399");
  await page.getByLabel("File customers receive").setInputFiles({
    name: "asset.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("asset"),
  });
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForURL(/\/dashboard\/products\/(?!new$)[^/]+$/);
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(page.getByText("PUBLISHED")).toBeVisible();

  const domain = `${username}.example.test`;
  await page.goto("/dashboard/domain");
  await page.getByLabel("Domain").fill(domain);
  await page.getByRole("button", { name: /connect domain/i }).click();
  await expect(page.getByText(domain, { exact: true })).toBeVisible();

  markDomainVerified(domain);

  // waitUntil: "domcontentloaded" rather than the default "load" — Next.js dev
  // mode's allowedDevOrigins protection blocks cross-origin requests for HMR/
  // static chunks (dev-only; doesn't exist in a production build), which would
  // otherwise stall the "load" event forever. The SSR'd HTML is what actually
  // proves the routing fix; full client hydration isn't the point of this test.
  const { browser: domainBrowser, page: domainPage } = await launchAsHost(domain);
  await domainPage.goto(`http://${domain}:${APP_PORT}/`, { waitUntil: "domcontentloaded" });
  await expect(domainPage.getByText("Domain Test Product")).toBeVisible();

  // A click-triggered navigation would hit the same blocked-HMR "load" stall
  // as above — extract the href and navigate explicitly instead.
  const productHref = await domainPage
    .getByRole("link", { name: "Domain Test Product" })
    .getAttribute("href");
  await domainPage.goto(`http://${domain}:${APP_PORT}${productHref}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(domainPage.getByText("₹399")).toBeVisible();
  await expect(domainPage.getByRole("link", { name: /^buy now$/i })).toBeVisible();
  await domainBrowser.close();

  // An unverified domain must not render anything — the gate that keeps a
  // rewritten-but-unverified host from leaking a storefront.
  const otherDomain = `unverified-${Date.now()}.example.test`;
  const { browser: otherBrowser, page: otherPage } = await launchAsHost(otherDomain);
  const response = await otherPage.goto(`http://${otherDomain}:${APP_PORT}/`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
  await otherBrowser.close();
});
