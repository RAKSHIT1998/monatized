"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setCreatorPlan } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

type Plan = { id: string; name: string };

export function CreatorPlanSelect({
  creatorProfileId,
  currentPlanId,
  plans,
}: {
  creatorProfileId: string;
  currentPlanId: string;
  plans: Plan[];
}) {
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId);
  const [pending, setPending] = useState(false);

  async function handleUpdate() {
    setPending(true);
    try {
      await setCreatorPlan(creatorProfileId, selectedPlanId);
      toast.success("Plan updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the plan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selectedPlanId}
        onChange={(e) => setSelectedPlanId(e.target.value)}
        className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
        aria-label="Change plan"
      >
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>
      {selectedPlanId !== currentPlanId && (
        <Button type="button" size="xs" disabled={pending} onClick={handleUpdate}>
          {pending ? "Saving…" : "Save"}
        </Button>
      )}
    </div>
  );
}
