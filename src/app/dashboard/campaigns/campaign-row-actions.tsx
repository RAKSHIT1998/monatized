"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteCampaign, sendCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";

export function CampaignRowActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: "DRAFT" | "SENT";
}) {
  const [pending, setPending] = useState(false);

  async function handleSend() {
    if (!window.confirm("Send this email now? This can't be undone.")) return;
    setPending(true);
    try {
      await sendCampaign(campaignId);
      toast.success("Campaign sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send campaign.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await deleteCampaign(campaignId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete campaign.");
    }
  }

  if (status === "SENT") {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={handleSend}>
        {pending ? "Sending…" : "Send now"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        Delete
      </Button>
    </div>
  );
}
