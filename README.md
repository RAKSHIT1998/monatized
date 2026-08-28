# Monetized

**Turn your audience into a business.** A full creator-commerce platform —
storefront, checkout, digital delivery, courses, subscriptions, bookings,
physical products, tips, community, affiliates, automations, email, an AI
growth engine, and custom domains — inspired by the business model of Stan
Store, Gumroad, and similar link-in-bio commerce tools. It does not clone
anyone's branding or code, and it only claims features that actually work end
to end.

## What's built

- **Auth** — email/password signup & login, stateless JWT sessions (httpOnly
  cookie, `jose`), server-side revocation via a `tokenVersion` bump, RBAC
  (`CREATOR` / `ADMIN`), and self-service password reset: a time-limited
  (1 hour), single-use token — only its SHA-256 hash is ever stored, so a DB
  leak alone can't be used to reset an account — emailed via the same
  `EmailProvider` abstraction campaigns use. The "check your email" response
  is identical whether or not the address has an account, to avoid leaking
  which emails are registered. Resetting bumps `tokenVersion` (signing out
  every session) and explicitly clears the browser's own cookie, so a reset
  from a browser that's still logged in elsewhere can't leave a stale,
  cryptographically-valid-but-DB-invalidated cookie behind.
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
- **Order confirmation emails** — since there's no customer login system,
  the bookmarkable `/order/[orderNumber]` (or `/member/[accessToken]` for a
  new subscriber) link is a buyer's only way back to what they bought.
  `markOrderPaid`/`activateSubscription` email that link to the buyer via the
  same `EmailProvider` abstraction, logged to `EmailLog` for visibility. A
  send failure is caught and never allowed to break the payment flow that
  triggered it — same posture as automations.
- **Analytics** — store views / product views / checkout starts / conversion
  rate, a revenue-over-time chart, top products by revenue.
- **Admin panel** — platform overview (GMV, platform revenue, creators by
  plan), all creators, all orders, and an editable plan/pricing table.
- **Billing** — a creator-facing page showing their current plan, usage vs.
  limit, and the other available plans.
- **Plan-tier feature gating** — Automations, the AI growth engine, and
  custom domains are Pro-plan features (per the pricing table's own
  marketing copy), enforced at both the page (a locked "Upgrade" state
  instead of the feature) and the server action (the same check, so the
  UI lock is never the only thing standing between a Free/Creator creator
  and the feature). The sidebar nav shows a "PRO" badge next to each gated
  section before a creator ever clicks in.
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

- **Bookings** *(Phase 3)* — a fourth product type for 1:1 sessions. Creators
  set weekly availability windows (day + start/end time, all in **UTC** — see
  Known items) and a session length; buyers pick an open slot at checkout. A
  slot is reserved the moment checkout starts via a DB-level unique constraint
  on `(productId, startsAt)`, so two buyers can never win the same time even
  under concurrent checkouts; if the payment then fails or the checkout is
  abandoned, the hold is deleted outright and the slot reopens. Access is a
  bookmarkable `/booking/[accessToken]` link where either side can cancel — a
  cancellation after a real payment is a soft-cancel (the record stays visible
  for history) rather than a slot-freeing delete, a deliberate, narrower scope
  than the abandoned-checkout case.
- **Community / memberships** *(Phase 3)* — creators publish posts (optionally
  members-only) from `/dashboard/community`; access is gated on having an
  ACTIVE/PAST_DUE subscription to the creator, checked at the same
  `/member/[accessToken]` identity subscriptions already use — no new login
  system. Members can comment; creators can reply and moderate (delete)
  comments.
- **Affiliates** *(Phase 3)* — partners get a `?ref=CODE` link and a
  bookmarkable `/affiliate/[accessToken]` stats page. The referral cookie is
  set by `proxy.ts` on any storefront visit (30-day attribution window) and
  resolved against a real, active `Affiliate` row at checkout-start — captured
  on the `Order` itself, the same pattern coupons already use, so webhooks
  never need to re-derive attribution. Commission is a running ledger
  (`AffiliateReferral`, credited in `markOrderPaid`) — **actual payout to the
  affiliate is a manual step outside this app**, the same posture as not
  faking payment success anywhere else here.
- **Automations** *(Phase 3)* — simple `when X, then Y` rules: trigger on an
  order being paid, a new subscriber, or a cancelled subscription; action is
  either tagging the customer or sending them an email. Failures are caught
  and logged, never allowed to break the payment/subscription flow that
  triggered them.
- **Email campaigns** *(Phase 3)* — one-off emails to all customers or active
  subscribers only, via an `EmailProvider` abstraction: `console` (default,
  logs + records an `EmailLog`, delivers nothing — dev/demo only) or `resend`
  (real delivery, called directly over `fetch` rather than adding their SDK).
  Sending is synchronous — fine at demo/small-list scale; a real production
  version would hand this to a background queue.
- **AI growth engine** *(Phase 4)* — two honestly-scoped pieces, not one fake
  "AI does everything" black box: (1) **Insights** are rule-based heuristics
  computed from the creator's own numbers (revenue concentration, past-due
  subscribers, checkout conversion, repeat-customer rate) — explainable, not
  generated. (2) A **product description writer** goes through an `AiProvider`
  abstraction: `template` (default, deterministic text, no external call) or
  `anthropic` (real generation via the official `@anthropic-ai/sdk`, model
  `claude-opus-5`).
- **Custom domains** *(Phase 4)* — connect a domain, verify ownership via a
  DNS TXT record (a real `dns.resolveTxt` lookup, never faked), then it serves
  the exact same storefront/product/checkout pages as `monetized.com/{username}`
  would. Routing works by having the Edge-safe `proxy.ts` rewrite unverified
  hosts to an internal `/sites/[domain]/...` path — it does no DB lookup
  itself (can't; Prisma's driver adapter needs Node, not the Edge runtime) —
  where a normal server component resolves the domain against the
  `CustomDomain` table and renders. Verifying proves ownership; actually
  routing traffic here still requires the creator's own DNS (CNAME/A record)
  pointed at wherever this app is deployed, same as any real custom-domain
  product.
- **Physical products** *(Phase 5)* — a fifth product type for shippable
  goods. An optional stock count (blank = unlimited) is decremented atomically
  at checkout — guarded by a conditional `UPDATE ... WHERE stockQuantity > 0`
  so two concurrent buyers can never both win the last unit, the same
  optimistic-reservation pattern bookings use for slots — and restored if the
  order later fails, the same as an abandoned booking hold freeing its slot.
  Checkout collects a shipping address (stored on the `Order`); creators mark
  orders shipped with an optional tracking number from `/dashboard/orders`,
  which the buyer then sees on their receipt.
- **Tips & donations** *(Phase 5)* — a sixth product type for one-off
  supporter tips. The creator's price is a *suggested* amount only (chip
  presets at 1×/2×/5×), never an enforced minimum — a buyer can also enter any
  custom amount above a ₹1 floor. Buyers can leave an optional message, shown
  to the creator on the product's "Tips received" panel alongside every
  supporter's amount.
- **Installable app (PWA)** — a web manifest + minimal service worker make
  the dashboard installable from a browser's "Add to Home Screen" / install
  prompt. This is the honest equivalent of "the mobile app" achievable from a
  single Next.js codebase with no native build pipeline — not an App
  Store/Play Store binary, which would need a separate React Native project
  and its own submission process. The service worker only caches static,
  content-hashed assets and only registers in production, specifically so it
  never risks serving stale dashboard data or interfering with local dev.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui
(on Base UI, not Radix) · PostgreSQL + Prisma 7 (driver adapters, no Rust
engine) · Playwright (E2E) · Vitest (unit) · `@anthropic-ai/sdk` (optional AI
provider).

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
- `EMAIL_PROVIDER=console` (default) — campaigns/automation emails are logged
  and recorded, never delivered. Set to `resend` and fill in `RESEND_API_KEY`
  to actually send.
- `AI_PROVIDER=template` (default) — the growth engine's description writer
  uses deterministic, rule-based text, no key needed. Set to `anthropic` and
  fill in `ANTHROPIC_API_KEY` to generate with Claude instead.

## Testing

```bash
npx vitest run          # unit tests — pure logic (validation schemas, money formatting,
                         # booking slot math, growth insights, host matching)
npx playwright install chromium   # first time only
npx playwright test     # end-to-end — one spec per feature area, from signup/
                         # onboarding through every feature listed above
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
- Booking availability is UTC-only — there's no per-creator timezone setting
  yet, so times entered in the availability editor are exactly what buyers see.
- A booking cancelled *after* a real payment (by either side) is a soft-cancel;
  unlike an abandoned/failed checkout's hold, that exact slot isn't
  automatically reopened for someone else to book. Documented scope choice,
  same posture as the two items below.
- Custom-domain URLs still include the platform username segment (e.g.
  `yourdomain.com/{username}/{slug}`) — the `sites/[domain]/...` routes reuse
  the exact same storefront/product/checkout page components verbatim rather
  than duplicating them, which keeps the URL shape consistent with
  `monetized.com/{username}/{slug}` at the cost of one redundant segment.
  Cosmetic only; nothing depends on it being shorter.
- Verifying a custom domain proves ownership (a real DNS TXT lookup) — it does
  not by itself route traffic here. Actually reaching the storefront over that
  domain still requires the creator's own DNS (CNAME/A record) pointed at
  wherever this app is deployed.
- Coupons and affiliate attribution apply to one-time Digital/Course/Booking/
  Physical checkouts only, not Subscriptions or Tips — for Subscriptions,
  because billing cycles are created outside the normal checkout-time Order
  flow (see `recordBillingCycle` in `src/lib/subscriptions.ts`); for Tips,
  because the price is buyer-chosen, so a percent/fixed discount off a
  creator-set price doesn't apply.

## Project structure

```
prisma/schema.prisma       Data model — one migration per feature area in prisma/migrations
prisma/seed.ts             Pricing plans + dev admin user
src/lib/                   Framework-agnostic logic: auth, payments/email/AI provider
                            abstractions, storage abstraction, validation schemas, orders
src/app/actions/           Server actions (mutations)
src/app/(auth)/            Login / signup
src/app/onboarding/        Creator onboarding wizard
src/app/dashboard/         Creator app (products, orders, customers, analytics, coupons,
                            community, affiliates, campaigns, automations, domain, growth,
                            store editor, billing)
src/app/admin/             Platform admin
src/app/[username]/        Public storefront + product pages + checkout
src/app/sites/             Custom-domain routes — reuse the [username] pages verbatim
src/app/member/            Subscriber membership page + gated community feed
src/app/booking/           Buyer-facing booking confirmation/cancellation
src/app/affiliate/         Affiliate self-service stats page
src/app/api/               Download delivery, public asset serving, payment webhooks, order CSV export
src/proxy.ts               Auth gating + affiliate ref-cookie capture + custom-domain rewrite
e2e/                       Playwright end-to-end specs, one per feature area
```
