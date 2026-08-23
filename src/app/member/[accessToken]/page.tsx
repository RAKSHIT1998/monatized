import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { hasActiveMembership } from "@/lib/membership";
import { MemberActions } from "./member-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MessagesSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Your membership — Monetized",
};

const STATUS_LABEL: Record<string, string> = {
  INCOMPLETE: "Awaiting payment",
  ACTIVE: "Active",
  PAST_DUE: "Payment failed — past due",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export default async function MemberPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;

  const subscription = await db.subscription.findUnique({
    where: { accessToken },
    include: { product: true, creatorProfile: { select: { displayName: true, username: true } } },
  });

  if (!subscription) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">{subscription.creatorProfile.displayName}</p>
        <h1 className="text-xl font-semibold tracking-tight">{subscription.product.title}</h1>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={
                subscription.status === "ACTIVE"
                  ? "default"
                  : subscription.status === "PAST_DUE"
                    ? "destructive"
                    : "secondary"
              }
            >
              {subscription.cancelAtPeriodEnd ? "Cancelling" : STATUS_LABEL[subscription.status]}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="text-sm font-medium">
              {formatMoney(subscription.unitAmountMinor, subscription.currency)} /{" "}
              {subscription.billingInterval === "MONTHLY" ? "month" : "year"}
            </span>
          </div>

          {subscription.currentPeriodEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {subscription.cancelAtPeriodEnd ? "Access ends" : "Renews"}
              </span>
              <span className="text-sm font-medium">
                {subscription.currentPeriodEnd.toLocaleDateString("en-IN")}
              </span>
            </div>
          )}

          {subscription.product.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {subscription.product.description}
            </p>
          )}

          {hasActiveMembership(subscription.status) && (
            <Link
              href={`/member/${accessToken}/community`}
              className={buttonVariants({ variant: "outline" })}
            >
              <MessagesSquare className="size-4" />
              Community
            </Link>
          )}

          <MemberActions
            accessToken={accessToken}
            status={subscription.status}
            provider={subscription.provider}
            cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
          />
        </CardContent>
      </Card>
    </div>
  );
}
