"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteCoupon, setCouponActive } from "@/app/actions/coupons";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function CouponRowActions({
  couponId,
  isActive,
}: {
  couponId: string;
  isActive: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function toggleActive() {
    setPending(true);
    try {
      await setCouponActive(couponId, !isActive);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update coupon.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this coupon permanently?")) return;
    setPending(true);
    try {
      await deleteCoupon(couponId);
      toast.success("Coupon deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete coupon.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={toggleActive}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button size="icon-sm" variant="ghost" disabled={pending} onClick={handleDelete}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
