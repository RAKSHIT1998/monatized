import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SuspendCreatorControls } from "./suspend-creator-controls";

export const metadata: Metadata = {
  title: "Creator — Monetized Admin",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PAID: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
};

export default async function AdminCreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const creator = await db.creatorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      plan: true,
      platformSubscription: { include: { plan: { select: { name: true } } } },
      _count: { select: { products: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { customer: { select: { email: true } } },
      },
    },
  });

  if (!creator) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/creators"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to creators
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{creator.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              @{creator.username} — {creator.user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {creator.suspendedAt && <Badge variant="destructive">Suspended</Badge>}
            <a
              href={`/${creator.username}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View store
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {creator.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                creator.orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 rounded-md p-2 text-sm hover:bg-muted"
                  >
                    <span className="font-mono text-xs">{order.orderNumber}</span>
                    <span className="text-muted-foreground">{order.customer.email}</span>
                    <span className="tabular-nums">{formatMoney(order.totalAmountMinor, order.currency)}</span>
                    <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
              <CardDescription>{creator._count.products} products</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p className="font-medium">{creator.plan.name}</p>
              {creator.platformSubscription && creator.platformSubscription.status !== "CANCELLED" ? (
                <p className="text-muted-foreground">
                  Billing status: {creator.platformSubscription.status}
                  {creator.platformSubscription.currentPeriodEnd &&
                    ` — renews ${creator.platformSubscription.currentPeriodEnd.toLocaleDateString("en-IN")}`}
                </p>
              ) : (
                <p className="text-muted-foreground">No active platform billing.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trust &amp; safety</CardTitle>
              {creator.suspendedAt && creator.suspensionReason && (
                <CardDescription>Reason: {creator.suspensionReason}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <SuspendCreatorControls creatorProfileId={creator.id} suspended={Boolean(creator.suspendedAt)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
