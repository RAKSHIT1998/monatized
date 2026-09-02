import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A Pro-gated screen, shown to a creator who doesn't have the plan for it.
 *
 * Rather than a bare lock icon on an empty page — which reads as "this
 * feature is broken" — the real UI renders underneath with representative
 * sample data, dimmed and made inert, with the upgrade card floating over
 * it. The creator can see exactly what they'd be buying.
 *
 * This is presentational only. The page that renders it has already decided
 * the creator lacks access, and the corresponding server actions check
 * again via hasFeatureAccess — nothing here is what keeps the feature
 * locked.
 */
export function FeaturePreview({
  feature,
  minPlanName,
  summary,
  benefits,
  children,
}: {
  feature: string;
  minPlanName: string;
  summary: string;
  benefits: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {/* inert: not just visually dimmed — nothing inside can be focused,
          clicked or tabbed into, so the preview can't be mistaken for a
          working screen by a keyboard or screen-reader user. */}
      <div
        inert
        aria-hidden
        className="pointer-events-none max-h-[32rem] overflow-hidden opacity-45 blur-[1.5px] select-none"
      >
        {children}
      </div>

      <div className="from-background via-background/80 pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent" />

      <div className="absolute inset-0 flex items-start justify-center pt-16">
        <div className="bg-card mx-4 flex max-w-md flex-col gap-4 rounded-xl border p-6 shadow-lg">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-full"
            >
              <Sparkles className="size-4" />
            </span>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.15em] uppercase">
              {minPlanName} plan
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-lg font-medium tracking-tight">{feature}</p>
            <p className="text-muted-foreground text-sm">{summary}</p>
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-baseline gap-2">
                <span aria-hidden className="text-primary font-mono text-xs">
                  +
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <Link href="/dashboard/billing" className={cn(buttonVariants(), "mt-1 w-full")}>
            Upgrade to {minPlanName}
          </Link>
          <p className="text-muted-foreground text-center text-xs">
            This is a preview with sample data — upgrading turns it on for your store.
          </p>
        </div>
      </div>
    </div>
  );
}
