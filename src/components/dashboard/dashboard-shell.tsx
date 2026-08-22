"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ExternalLink } from "lucide-react";
import { DashboardNav } from "./dashboard-nav";
import { UserMenu } from "./user-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type DashboardShellProps = {
  displayName: string;
  username: string;
  planName: string;
  children: React.ReactNode;
};

export function DashboardShell({ displayName, username, planName, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-neutral-50/50 p-4 md:flex dark:bg-neutral-950/50">
        <Link href="/dashboard" className="mb-6 px-2 text-lg font-semibold tracking-tight">
          Monetized
        </Link>
        <DashboardNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {planName}
            </span>
          </div>

          <a
            href={`/${username}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            View store
            <ExternalLink className="size-3.5" />
          </a>

          <UserMenu displayName={displayName} />
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Monetized</SheetTitle>
          </SheetHeader>
          <DashboardNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
