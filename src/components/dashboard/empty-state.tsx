import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// One empty state for every dashboard list. A brand-new creator sees these
// on nearly every screen, so they carry a lot of the product's first
// impression — hence the accent-tinted mark, a real explanation of what the
// thing is for, and a way to act rather than just "No orders yet."
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span
          aria-hidden
          className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full"
        >
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-medium">{title}</p>
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>
        </div>
        {action && (
          <Link href={action.href} className={cn(buttonVariants(), "mt-1")}>
            {action.label}
          </Link>
        )}
        {hint && (
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
