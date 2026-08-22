import Link from "next/link";
import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard — Monetized",
};

export default async function DashboardOverviewPage() {
  const user = await requireOnboardedCreator();
  const creatorProfileId = user.creatorProfile.id;

  const [productsCount, paidOrdersCount, customersCount, revenue] = await Promise.all([
    db.product.count({ where: { creatorProfileId } }),
    db.order.count({ where: { creatorProfileId, status: "PAID" } }),
    db.customer.count({ where: { creatorProfileId } }),
    db.order.aggregate({
      where: { creatorProfileId, status: "PAID" },
      _sum: { totalAmountMinor: true },
    }),
  ]);

  const currency = user.creatorProfile.plan.currency;
  const totalRevenueMinor = revenue._sum.totalAmountMinor ?? 0;

  const checklist = [
    { done: productsCount > 0, label: "Add your first product", href: "/dashboard/products/new" },
    { done: false, label: "Customize your storefront", href: "/dashboard/store" },
    { done: paidOrdersCount > 0, label: "Make your first sale", href: `/${user.creatorProfile.username}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s how {user.creatorProfile.displayName}&apos;s store is doing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(totalRevenueMinor, currency)} />
        <StatCard label="Orders" value={String(paidOrdersCount)} />
        <StatCard label="Products" value={String(productsCount)} />
        <StatCard label="Customers" value={String(customersCount)} />
      </div>

      {checklist.some((item) => !item.done) && (
        <Card>
          <CardHeader>
            <CardTitle>Get your store ready</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {checklist.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2.5 rounded-md p-2 text-sm hover:bg-muted"
              >
                {item.done ? (
                  <CheckCircle2 className="size-4 text-foreground" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={item.done ? "text-muted-foreground line-through" : ""}>
                  {item.label}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {productsCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add your first product</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Sell a PDF, template, preset, or any downloadable file directly from your store.
            </p>
            <Link
              href="/dashboard/products/new"
              className={cn(buttonVariants(), "w-fit")}
            >
              Create a product
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
