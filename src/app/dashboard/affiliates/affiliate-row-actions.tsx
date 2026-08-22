"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setAffiliateActive } from "@/app/actions/affiliates";
import { Button } from "@/components/ui/button";

export function AffiliateRowActions({
  affiliateId,
  isActive,
}: {
  affiliateId: string;
  isActive: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      await setAffiliateActive(affiliateId, !isActive);
      toast.success(isActive ? "Affiliate deactivated." : "Affiliate reactivated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update affiliate.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={toggle}>
      {isActive ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
