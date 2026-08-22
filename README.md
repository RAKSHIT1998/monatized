# Monetized

**Turn your audience into a business.** A creator-commerce platform — storefront,
checkout, and instant digital delivery — inspired by the business model of
Stan Store, Gumroad, and similar link-in-bio commerce tools. This repo started
as the **Phase 1 (MVP) foundation** and is now growing into Phase 2: it does
not clone anyone's branding or code, and it only claims features that actually
work end to end.

## What's built

- **Auth** — email/password signup & login, stateless JWT sessions (httpOnly
  cookie, `jose`), server-side revocation via a `tokenVersion` bump, RBAC
  (`CREATOR` / `ADMIN`).
- **Onboarding** — a 3-step wizard (business basics → claim your store URL →
  launch) that provisions a `CreatorProfile` on signup.
- **Creator dashboard** — overview, products, orders, customers, analytics,
  store editor, billing, settings nav shell.
- **Digital products** — create/edit/publish/archive, file uploads via a
  storage abstraction (local disk in dev, S3-compatible in production),
  per-plan product limits.
- **Public storefront** — `monetized.com/@username` link-in-bio style page +
  per-product pages, theming (accent color, button style), social links.
- **Checkout & payments** — a `PaymentProvider` abstraction with three
  implementations: `mock` (simulated, for local dev/demos), `razorpay`
  (Payment Links API), and `stripe` (Checkout Sessions). Orders are only ever
  marked paid by a signature-verified webhook (or the mock provider's own
  clearly-labeled simulate button) — never by a client-side redirect alone.
- **Digital delivery** — signed, expiring, download-limited grants served from
  `/api/download/[token]`, decoupled from the storage backend.
- **Analytics** — store views / product views / checkout starts / conversion
  rate, a revenue-over-time chart, top products by revenue.
- **Admin panel** — platform overview (GMV, platform revenue, creators by
  plan), all creators, all orders, and an editable plan/pricing table.
- **Billing** — a creator-facing page showing their current plan, usage vs.
  limit, and the other available plans.
- **Coupons** *(Phase 2)* — percent or fixed-amount discount codes, redemption
  limits, expiry dates; applied live at checkout (preview before paying) and
  redeemed only when the order is actually confirmed paid, never on checkout
  start. A coupon covering 100% of the price skips the payment provider
  entirely rather than sending it a $0 charge.
- **Account settings** — change password, which bumps `tokenVersion` to sign
  out every other session while keeping the current one logged in.
- **Customer CRM** *(Phase 2)* — tags and private notes per customer, with a
  client-side search across email/name/tag.
- **Courses** *(Phase 2)* — a second product type alongside digital downloads.
  Creators build a curriculum (modules → lessons, text or embedded video) and
  reorder it; publishing requires at least one lesson, mirroring the "at least
  one file" rule for digital products. There's no customer login system
  (checkout stays guest/email-only), so a purchase grants access via a
  long-lived, bookmarkable link (`/learn/[accessToken]`) rather than a
  password account — the same token-based pattern as digital downloads, just
  without a download limit. Buyers track lesson completion against that token.
- **Subscriptions** *(Phase 2)* — a third product type for recurring billing
  (monthly/yearly). Each subscriber's price and billing interval are locked in
  at signup, so a later price change never silently reprices an existing
  member. Every billing cycle — the first charge and every renewal — creates
  its own PAID `Order`, so revenue analytics and admin reporting need no
  parallel ledger. Access is a bookmarkable `/member/[accessToken]` link (same
  reasoning as courses: no customer login system), where a subscriber can
  cancel (graceful, at period end) independent of the creator, who can also
  cancel from the product's Subscribers panel. **Stripe only** — recurring
  billing via Checkout Sessions (`mode: subscription`) plus a webhook handling
  the full lifecycle (activation, renewal, past-due, cancellation). Razorpay's
  recurring product (Subscriptions API) needs a pre-created Plan and isn't
  wired up; selecting it for a subscription product fails with a clear error
  rather than silently charging once. The `mock` provider simulates the whole
  lifecycle (activate/renew/mark past-due) via clearly-labeled dev-only
  buttons on the member page, exactly like the one-time mock checkout.

Bookings, memberships, community, affiliates, automations, the AI growth
engine, and the mobile app are still **out of scope** — see the phased
roadmap this project followed (Phase 2/3/4) before building any of those on
top of this foundation.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui
(on Base UI, not Radix) · PostgreSQL + Prisma 7 (driver adapters, no Rust
engine) · Playwright (E2E) · Vitest (unit).

## Getting started

**Prerequisites:** Node 22+, Docker (for local Postgres).

```bash
npm install
cp .env.example .env        # fill in SESSION_SECRET at minimum — see below
docker compose up -d postgres
npx prisma migrate dev
npx prisma db seed          # seeds the 4 pricing plans + a dev admin user
npm run dev
```

Open http://localhost:3000. Sign up as a creator, or log in to `/admin` with
the seeded admin credentials printed by the seed command (defaults to
`admin@monetized.local` / `ChangeMe123!` — **rotate this immediately if you
ever deploy anywhere real**).

### Environment variables

See `.env.example` for the full list with comments. The only one you must set
yourself is `SESSION_SECRET` (`openssl rand -base64 32`) — everything else has
a working local-dev default. Notably:

- `PAYMENT_PROVIDER=mock` (default) — no external calls, checkout is completed
  via an explicit "simulate payment" button. Set to `razorpay` or `stripe` and
  fill in the matching keys to take real payments.
- `STORAGE_DRIVER=local` (default) — uploads land in `./storage/` on disk.
  Dev-only; set to `s3` with an S3-compatible bucket for anything persistent.

## Testing

```bash
npx vitest run          # unit tests — pure logic (validation schemas, money formatting)
npx playwright install chromium   # first time only
npx playwright test     # end-to-end — signup through onboarding, products,
                         # storefront, checkout, analytics, admin
```

The E2E suite runs against `npm run dev` (Turbopack). In this sandbox, the
**first** navigation to any route after a fresh dev-server start can take
20–50s+ to compile (Turbopack compiles routes lazily in dev, and this
environment's filesystem is slow — Next.js prints its own "Slow filesystem
detected" warning). That shows up as flaky-looking Playwright timeouts on a
cold server and disappears on the second run once routes are warm. It does
not occur with `next build && next start` (production mode compiles
everything up front) and is not expected on a normal local machine or CI
runner with a fast disk.

## Known items

- `npm audit` reports a high-severity advisory in `deepmerge-ts`, pulled in
  transitively by `@prisma/config` (the `prisma` CLI, a devDependency — not
  `@prisma/client`, which is what actually ships at runtime). No fixed stable
  Prisma release exists yet as of this writing; the suggested `--force` fix
  downgrades to Prisma 6, which would undo the driver-adapter architecture
  this app relies on. Revisit when Prisma ships a patch.
- Base UI's `Button` renders `role="button"` when composed via `render` with a
  non-button element and `nativeButton={false}`. Every "link styled as a
  button" in this app therefore uses `buttonVariants()` applied directly to a
  real `<Link>`/`<a>` instead of `<Button render={<Link />}>`, to keep the
  correct implicit `link` accessibility role.

## Project structure

```
prisma/schema.prisma       Phase 1 data model (only what's actually used)
prisma/seed.ts             Pricing plans + dev admin user
src/lib/                   Framework-agnostic logic: auth, payments abstraction,
                            storage abstraction, validation schemas, orders
src/app/actions/           Server actions (mutations)
src/app/(auth)/            Login / signup
src/app/onboarding/        Creator onboarding wizard
src/app/dashboard/         Creator app (products, orders, customers, analytics,
                            store editor, billing)
src/app/admin/             Platform admin
src/app/[username]/        Public storefront + product pages + checkout
src/app/api/               Download delivery, public asset serving, payment webhooks
e2e/                       Playwright end-to-end specs
```
