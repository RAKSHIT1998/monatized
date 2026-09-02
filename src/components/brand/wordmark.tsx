import { cn } from "@/lib/utils";

// One wordmark for the whole product — marketing site, auth, dashboard and
// admin. Previously each surface rendered its own text in whatever font that
// screen happened to load, which is a large part of why they didn't look
// like the same company.
export function Wordmark({
  className,
  showDot = true,
}: {
  className?: string;
  showDot?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {showDot && (
        <span
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--brand-rust)" }}
          aria-hidden
        />
      )}
      <span className="text-lg font-medium tracking-tight">Monetized</span>
    </span>
  );
}
