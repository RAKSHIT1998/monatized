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
import { hasFeatureAccess } from "@/lib/plan-features";
import type { PlanKey } from "@/generated/prisma/client";
import type { GatedFeature } from "@/lib/plan-features";

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/coupons", label: "Coupons", icon: Tag },
  { href: "/dashboard/community", label: "Community", icon: MessagesSquare },
  { href: "/dashboard/affiliates", label: "Affiliates", icon: Handshake },
  { href: "/dashboard/campaigns", label: "Email", icon: Mail },
  { href: "/dashboard/automations", label: "Automations", icon: Zap, feature: "AUTOMATIONS" },
  { href: "/dashboard/domain", label: "Domain", icon: Globe, feature: "CUSTOM_DOMAIN" },
  { href: "/dashboard/growth", label: "Growth engine", icon: Sparkles, feature: "GROWTH_ENGINE" },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/store", label: "Store editor", icon: Store },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  feature?: GatedFeature;
}>;

export function DashboardNav({
  planKey,
  onNavigate,
}: {
  planKey: PlanKey;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard" ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
        const locked = item.feature ? !hasFeatureAccess(planKey, item.feature) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              // Selection uses the sidebar tokens, not --primary: the mint
              // accent is reserved for actions, so a selected nav row never
              // competes with the page's actual call to action.
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {locked && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[10px] tracking-wide",
                  isActive
                    ? "bg-sidebar-primary-foreground/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                PRO
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
