import { NextResponse } from "next/server";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

// Escapes a field for CSV per RFC 4180: wrap in quotes and double up any
// embedded quotes whenever the value could otherwise break column boundaries.
function csvField(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const user = await requireOnboardedCreator();

  const orders = await db.order.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: true },
  });

  const header = [
    "Order",
    "Date",
    "Customer email",
    "Items",
    "Total",
    "Status",
    "Fulfillment",
    "Tracking number",
  ];

  const rows = orders.map((order) => [
    order.orderNumber,
    order.createdAt.toISOString(),
    order.customer.email,
    order.items
      .map((i) => {
        const name = i.variantLabel ? `${i.titleSnapshot} — ${i.variantLabel}` : i.titleSnapshot;
        return i.quantity > 1 ? `${i.quantity}x ${name}` : name;
      })
      .join("; "),
    formatMoney(order.totalAmountMinor, order.currency),
    order.status,
    order.fulfillmentStatus,
    order.trackingNumber ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
