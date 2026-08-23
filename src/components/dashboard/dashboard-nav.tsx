"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Store,
  Settings,
  CreditCard,
  Tag,
  MessagesSquare,
  Handshake,
  Mail,
  Zap,
  Globe,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/coupons", label: "Coupons", icon: Tag },
  { href: "/dashboard/community", label: "Community", icon: MessagesSquare },
  { href: "/dashboard/affiliates", label: "Affiliates", icon: Handshake },
  { href: "/dashboard/campaigns", label: "Email", icon: Mail },
  { href: "/dashboard/automations", label: "Automations", icon: Zap },
  { href: "/dashboard/domain", label: "Domain", icon: Globe },
  { href: "/dashboard/growth", label: "Growth engine", icon: Sparkles },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/store", label: "Store editor", icon: Store },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
