import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FulfillmentCell } from "./fulfillment-cell";
import { RefundButton } from "./refund-button";
import { Download, Receipt } from "lucide-react";

export const metadata: Metadata = {
  title: "Orders — Monetized",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
};

const PAGE_SIZE = 50;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireOnboardedCreator();
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    creatorProfileId: user.creatorProfile.id,
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" as const } },
            { customer: { email: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [orders, totalCount] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(targetPage));
    return `/dashboard/orders?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{totalCount} total</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex gap-2">
            <Input name="q" defaultValue={query} placeholder="Search by order # or email" className="w-64" />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          {totalCount > 0 && (
            <Link href="/api/export/orders" className={buttonVariants({ variant: "outline" })}>
              <Download className="size-4" />
              Export CSV
            </Link>
          )}
        </div>
      </div>

      {totalCount === 0 && !query ? (
        <EmptyState
          icon={Receipt}
          title="No orders yet"
          description="Every checkout on your store shows up here — paid, pending or refunded — with the buyer's details and what they bought."
          action={{ label: "Share your store", href: `/${user.creatorProfile.username}` }}
          hint="Orders arrive the moment someone pays"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customer.email}</TableCell>
                    <TableCell>
                      {order.items
                        .map((i) => {
                          const name = i.variantLabel ? `${i.titleSnapshot} — ${i.variantLabel}` : i.titleSnapshot;
                          return i.quantity > 1 ? `${i.quantity}x ${name}` : name;
                        })
                        .join(", ")}
                    </TableCell>
                    <TableCell>{formatMoney(order.totalAmountMinor, order.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <FulfillmentCell
                        orderId={order.id}
                        fulfillmentStatus={order.fulfillmentStatus}
                        trackingNumber={order.trackingNumber}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.createdAt.toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {order.status === "PAID" && (
                        <RefundButton
                          orderId={order.id}
                          amountMinor={order.totalAmountMinor}
                          currency={order.currency}
                          customerEmail={order.customer.email}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No orders match this search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={pageHref(page - 1)}
              aria-disabled={page <= 1}
              className={cn(buttonVariants({ variant: "outline" }), page <= 1 && "pointer-events-none opacity-50")}
            >
              Previous
            </Link>
            <Link
              href={pageHref(page + 1)}
              aria-disabled={page >= totalPages}
              className={cn(
                buttonVariants({ variant: "outline" }),
                page >= totalPages && "pointer-events-none opacity-50",
              )}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
