"use client";

import { useState } from "react";
import { toast } from "sonner";
import { completeMockPlatformSubscription } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

export function MockPlatformSubscriptionActions({
  platformSubscriptionId,
}: {
  platformSubscriptionId: string;
}) {
  const [pending, setPending] = useState<"success" | "failure" | null>(null);

  async function complete(outcome: "success" | "failure") {
    setPending(outcome);
    try {
      await completeMockPlatformSubscription(platformSubscriptionId, outcome);
    } catch (error) {
      setPending(null);
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={pending !== null} onClick={() => complete("success")}>
        {pending === "success" ? "Confirming…" : "Simulate successful payment"}
      </Button>
      <Button variant="outline" disabled={pending !== null} onClick={() => complete("failure")}>
        {pending === "failure" ? "Confirming…" : "Simulate failed payment"}
      </Button>
    </div>
  );
}
