"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cancelSubscriptionAsCreator } from "@/app/actions/subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

export type SubscriberRow = {
  id: string;
  email: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const STATUS_VARIANT: Record<SubscriptionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  INCOMPLETE: "secondary",
  PAST_DUE: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
};

export function SubscribersPanel({ subscribers }: { subscribers: SubscriberRow[] }) {
  if (subscribers.length === 0) {
    return <p className="text-sm text-muted-foreground">No subscribers yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Renews</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscribers.map((sub) => (
          <SubscriberRowItem key={sub.id} subscriber={sub} />
        ))}
      </TableBody>
    </Table>
  );
}

function SubscriberRowItem({ subscriber }: { subscriber: SubscriberRow }) {
  const [pending, setPending] = useState(false);
  const cancellable = subscriber.status === "ACTIVE" || subscriber.status === "PAST_DUE";

  async function handleCancel() {
    if (!window.confirm(`Cancel ${subscriber.email}'s subscription?`)) return;
    setPending(true);
    try {
      await cancelSubscriptionAsCreator(subscriber.id);
      toast.success("Subscription cancelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't cancel subscription.");
    } finally {
      setPending(false);
    }
  }

  return (
    <TableRow>
      <TableCell>{subscriber.email}</TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[subscriber.status]}>
          {subscriber.cancelAtPeriodEnd ? "Cancelling" : subscriber.status}
        </Badge>
      </TableCell>
      {/* Explicit locale — Client Component, rendered on both server and client;
          an implicit locale can format differently in each and trigger a
          hydration mismatch (see posts-list.tsx for the observed failure mode). */}
      <TableCell className="text-muted-foreground">
        {subscriber.currentPeriodEnd
          ? new Date(subscriber.currentPeriodEnd).toLocaleDateString("en-IN")
          : "—"}
      </TableCell>
      <TableCell>
        {cancellable && !subscriber.cancelAtPeriodEnd && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
