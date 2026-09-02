import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { MONETIZATION_CATEGORIES } from "@/lib/constants/categories";
import { ReceiptTicker } from "@/components/marketing/receipt-ticker";

// This page stays dark in both themes — it's the marketing face of the
// product, not a themed app surface. It reads the brand tokens directly
// (defined once in globals.css) rather than redeclaring the palette, so
// the app and the marketing site can't drift apart again.
const INK = "var(--brand-ink)";
const PAPER = "var(--brand-paper)";
const SIGNAL = "var(--brand-signal)";
const RUST = "var(--brand-rust)";
const LINE = "var(--brand-line)";
const MUTED = "var(--brand-muted)";

export default async function Home() {
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyMinor: "asc" } });

  return (
    <div
      className="font-sans"
      style={{ backgroundColor: INK, color: PAPER }}
    >
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: RUST }}
            aria-hidden
          />
          <span className="text-lg font-medium tracking-tight">Monetized</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-2 text-sm"
            style={{ color: MUTED }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: PAPER, color: INK }}
          >
            Start free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 pt-10 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
        <div className="flex flex-col gap-6">
          <p
            className="font-mono text-xs tracking-[0.2em]"
            style={{ color: SIGNAL }}
          >
            STOREFRONT · CHECKOUT · DELIVERY
          </p>
          <h1 className="text-4xl leading-[1.05] font-medium tracking-tight sm:text-6xl">
            Sell the thing
            <br />
            you already make.
          </h1>
          <p className="max-w-md text-lg leading-relaxed" style={{ color: MUTED }}>
            A storefront, checkout, and instant delivery for whatever you sell — a PDF, a
            preset pack, a coaching call. No plugins, no invoices, no chasing payments.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-full px-6 py-3 text-sm font-medium"
              style={{ backgroundColor: SIGNAL, color: INK }}
            >
              Start free — no card required
            </Link>
            <a
              href="#pricing"
              className="text-sm underline decoration-dashed underline-offset-4"
              style={{ color: MUTED }}
            >
              See pricing
            </a>
          </div>
        </div>

        <ReceiptTicker />
      </section>

      {/* What you can sell */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <p
          className="mb-6 font-mono text-xs tracking-[0.2em]"
          style={{ color: MUTED }}
        >
          WHAT YOU CAN SELL
        </p>
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2" style={{ backgroundColor: LINE }}>
          {MONETIZATION_CATEGORIES.map((category) => (
            <div
              key={category.value}
              className="flex items-center justify-between px-5 py-4"
              style={{ backgroundColor: INK }}
            >
              <span className="text-sm">{category.label}</span>
              <span
                className="font-mono text-[11px] tracking-[0.1em]"
                style={{ color: category.active ? SIGNAL : MUTED }}
              >
                {category.active ? "ACTIVE" : "COMING SOON"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-28">
        <p
          className="mb-6 font-mono text-xs tracking-[0.2em]"
          style={{ color: MUTED }}
        >
          PRICING
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
            return (
              <div
                key={plan.id}
                className="flex flex-col gap-4 px-5 py-6"
                style={{ backgroundColor: PAPER, color: INK }}
              >
                <div>
                  <p className="font-mono text-[11px] tracking-[0.15em] text-[var(--brand-muted-on-paper)]">
                    {plan.key}
                  </p>
                  <p className="mt-1 text-2xl font-medium tracking-tight">
                    {plan.priceMonthlyMinor === 0
                      ? "Free"
                      : formatMoney(plan.priceMonthlyMinor, plan.currency)}
                  </p>
                  {plan.priceMonthlyMinor > 0 && (
                    <p className="font-mono text-[11px] text-[var(--brand-muted-on-paper)]">
                      per month
                    </p>
                  )}
                </div>
                <div className="border-t border-dashed border-[color-mix(in_oklch,var(--brand-ink),var(--brand-paper)_78%)]" />
                <ul className="flex flex-col gap-2 text-sm">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-baseline gap-2">
                      <span
                        className="font-mono text-xs"
                        style={{ color: "color-mix(in oklch, var(--brand-signal), var(--brand-ink) 45%)" }}
                      >
                        +
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t px-6 py-20 text-center" style={{ borderColor: LINE }}>
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Your store, live in minutes.
        </h2>
        <p className="mx-auto mt-3 max-w-sm" style={{ color: MUTED }}>
          Pick a username, add a product, share the link. That&apos;s the whole setup.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-full px-6 py-3 text-sm font-medium"
          style={{ backgroundColor: SIGNAL, color: INK }}
        >
          Start free
        </Link>
      </section>

      <footer
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 font-mono text-[11px] tracking-[0.1em]"
        style={{ color: MUTED }}
      >
        <span>MONETIZED © {new Date().getFullYear()}</span>
        <span>MADE FOR CREATORS</span>
      </footer>
    </div>
  );
}
