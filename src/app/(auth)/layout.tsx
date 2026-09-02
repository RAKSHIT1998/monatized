import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ReceiptTicker } from "@/components/marketing/receipt-ticker";

// Two-panel: the form gets a calm, focused column, and the brand panel
// carries the same language as the landing page (mono eyebrow, the receipt
// motif, ink ground) so signing up doesn't feel like leaving the product
// you just read about. The panel is hidden below lg — on a phone the form
// is the only thing that matters.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-10 sm:px-10">
        <Link href="/" className="w-fit">
          <Wordmark />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground">
          MONETIZED © {new Date().getFullYear()}
        </p>
      </div>

      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{ backgroundColor: "var(--brand-ink)", color: "var(--brand-paper)" }}
      >
        <p
          className="font-mono text-xs tracking-[0.2em]"
          style={{ color: "var(--brand-signal)" }}
        >
          STOREFRONT · CHECKOUT · DELIVERY
        </p>

        <div className="flex flex-col gap-8">
          <h2 className="max-w-sm text-3xl leading-[1.15] font-medium tracking-tight">
            Everything you sell, in one link.
          </h2>
          <div className="max-w-xs">
            <ReceiptTicker />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm" style={{ color: "var(--brand-muted)" }}>
            Digital products, courses, memberships, coaching, physical goods and tips — with
            checkout and delivery handled.
          </p>
          <p className="font-mono text-[11px] tracking-[0.1em]" style={{ color: "var(--brand-muted)" }}>
            NO PLUGINS · NO INVOICES · NO CHASING PAYMENTS
          </p>
        </div>
      </div>
    </div>
  );
}
