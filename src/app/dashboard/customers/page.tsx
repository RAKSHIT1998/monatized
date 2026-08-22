import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { CustomersTable } from "./customers-table";

export const metadata: Metadata = {
  title: "Customers — Monetized",
};

export default async function CustomersPage() {
  const user = await requireOnboardedCreator();

  const customers = await db.customer.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const currency = user.creatorProfile.plan.currency;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">Everyone who has checked out from your store.</p>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No customers yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <CustomersTable
              customers={customers.map((customer) => ({
                id: customer.id,
                email: customer.email,
                name: customer.name,
                tags: customer.tags,
                notes: customer.notes,
                ordersCount: customer.ordersCount,
                totalSpentLabel: formatMoney(customer.totalSpentMinor, currency),
                since: customer.createdAt.toLocaleDateString(),
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
