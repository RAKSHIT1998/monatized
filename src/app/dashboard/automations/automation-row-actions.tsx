"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteAutomation, setAutomationActive } from "@/app/actions/automations";
import { Button } from "@/components/ui/button";

export function AutomationRowActions({
  automationId,
  isActive,
}: {
  automationId: string;
  isActive: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      await setAutomationActive(automationId, !isActive);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update automation.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this automation?")) return;
    try {
      await deleteAutomation(automationId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete automation.");
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" disabled={pending} onClick={toggle}>
        {isActive ? "Pause" : "Resume"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Delete
      </Button>
    </div>
  );
}
