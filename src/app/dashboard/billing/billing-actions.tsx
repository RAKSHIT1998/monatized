"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  cancelMyPlatformPlan,
  simulatePlatformPastDue,
  simulatePlatformRenewal,
  startPlanUpgrade,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

export function UpgradeButton({ planId, planName }: { planId: string; planName: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await startPlanUpgrade(planId);
    } catch (error) {
      setPending(false);
      toast.error(error instanceof Error ? error.message : "Couldn't start the upgrade.");
    }
  }

  return (
    <Button type="button" className="mt-2 w-full" disabled={pending} onClick={handleClick}>
      {pending ? "Redirecting to payment…" : `Upgrade to ${planName}`}
    </Button>
  );
}

export function DowngradeButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const { immediate } = await cancelMyPlatformPlan();
      toast.success(
        immediate ? "Downgraded to Free." : "You'll move to Free once your current period ends.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't downgrade.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="mt-2 w-full" disabled={pending} onClick={handleClick}>
      {pending ? "Downgrading…" : "Downgrade to Free"}
    </Button>
  );
}

export function CancelPlanButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const { immediate } = await cancelMyPlatformPlan();
      toast.success(
        immediate ? "Downgraded to Free." : "Your plan will end at the current period's end.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't cancel.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      {pending ? "Cancelling…" : "Cancel plan"}
    </Button>
  );
}

// Dev/demo-only — mirrors the member page's simulate controls for buyer
// subscriptions. Never shown for a real payment provider.
export function PlatformSimulateControls() {
  const [pending, setPending] = useState<"renew" | "fail" | null>(null);

  async function run(kind: "renew" | "fail") {
    setPending(kind);
    try {
      if (kind === "renew") {
        await simulatePlatformRenewal();
        toast.success("Simulated a renewal charge.");
      } else {
        await simulatePlatformPastDue();
        toast.success("Simulated a failed payment.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending !== null} onClick={() => run("renew")}>
        {pending === "renew" ? "Simulating…" : "Simulate renewal"}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={pending !== null} onClick={() => run("fail")}>
        {pending === "fail" ? "Simulating…" : "Simulate payment failure"}
      </Button>
    </div>
  );
}
