import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PlanForm } from "./plan-form";

export const metadata: Metadata = {
  title: "Plans — Monetized Admin",
};

export default async function AdminPlansPage() {
  const plans = await db.plan.findMany({ orderBy: { priceMonthlyMinor: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Changes apply to every creator on this plan immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <PlanForm key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
