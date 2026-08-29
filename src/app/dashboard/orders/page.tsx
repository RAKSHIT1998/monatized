import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FulfillmentCell } from "./fulfillment-cell";
import { RefundButton } from "./refund-button";
import { Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Orders — Monetized",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
};

export default async function OrdersPage() {
  const user = await requireOnboardedCreator();

  const orders = await db.order.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: true },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Every checkout attempt on your store.</p>
        </div>
        {orders.length > 0 && (
          <Link href="/api/export/orders" className={buttonVariants({ variant: "outline" })}>
            <Download className="size-4" />
            Export CSV
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No orders yet.
          </CardContent>
        </Card>
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
                    <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                    <TableCell>{order.customer.email}</TableCell>
                    <TableCell>
                      {order.items
                        .map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.titleSnapshot}` : i.titleSnapshot))
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
