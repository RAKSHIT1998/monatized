"use client";

import { useState } from "react";
import { toast } from "sonner";
import { completeMockSubscription } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";

export function MockSubscriptionActions({ subscriptionId }: { subscriptionId: string }) {
  const [pending, setPending] = useState<"success" | "failure" | null>(null);

  async function complete(outcome: "success" | "failure") {
    setPending(outcome);
    try {
      await completeMockSubscription(subscriptionId, outcome);
    } catch (error) {
      setPending(null);
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={pending !== null} onClick={() => complete("success")}>
        {pending === "success" ? "Confirming…" : "Simulate successful subscription"}
      </Button>
      <Button variant="outline" disabled={pending !== null} onClick={() => complete("failure")}>
        {pending === "failure" ? "Confirming…" : "Simulate failed payment"}
      </Button>
    </div>
  );
}
