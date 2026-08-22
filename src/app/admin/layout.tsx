import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/creators", label: "Creators" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/plans", label: "Plans" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b bg-neutral-50/50 px-4 py-3 dark:bg-neutral-950/50">
        <Link href="/admin" className="text-sm font-semibold tracking-tight">
          Monetized Admin
        </Link>
        <nav className="flex flex-wrap gap-1">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="ml-auto">
          <Button type="submit" variant="ghost" size="sm">
            Log out
          </Button>
        </form>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
