"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  cancelSubscriptionAsMember,
  simulatePastDue,
  simulateRenewal,
} from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PaymentProvider, SubscriptionStatus } from "@/generated/prisma/enums";

export function MemberActions({
  accessToken,
  status,
  provider,
  cancelAtPeriodEnd,
}: {
  accessToken: string;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  cancelAtPeriodEnd: boolean;
}) {
  const [pending, setPending] = useState(false);
  const canCancel = (status === "ACTIVE" || status === "PAST_DUE") && !cancelAtPeriodEnd;

  async function handleCancel() {
    if (!window.confirm("Cancel this subscription?")) return;
    setPending(true);
    try {
      await cancelSubscriptionAsMember(accessToken);
      toast.success("Subscription cancelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't cancel subscription.");
    } finally {
      setPending(false);
    }
  }

  async function handleRenew() {
    setPending(true);
    try {
      await simulateRenewal(accessToken);
      toast.success("Renewal simulated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't simulate renewal.");
    } finally {
      setPending(false);
    }
  }

  async function handlePastDue() {
    setPending(true);
    try {
      await simulatePastDue(accessToken);
      toast.success("Marked past due.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canCancel && (
        <Button variant="outline" disabled={pending} onClick={handleCancel}>
          Cancel subscription
        </Button>
      )}

      {provider === "MOCK" && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Dev/demo only — simulates what a real payment provider&apos;s billing cycle would do.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={handleRenew}>
              Simulate renewal
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={handlePastDue}>
              Simulate failed payment
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
