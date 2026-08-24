"use client";

import { useState } from "react";
import { toast } from "sonner";
import { markOrderShipped } from "@/app/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Truck } from "lucide-react";

export function FulfillmentCell({
  orderId,
  fulfillmentStatus,
  trackingNumber,
}: {
  orderId: string;
  fulfillmentStatus: "NOT_APPLICABLE" | "UNFULFILLED" | "SHIPPED";
  trackingNumber: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState("");
  const [pending, setPending] = useState(false);

  if (fulfillmentStatus === "NOT_APPLICABLE") {
    return <span className="text-muted-foreground">—</span>;
  }

  if (fulfillmentStatus === "SHIPPED") {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge>Shipped</Badge>
        {trackingNumber && <span className="text-xs text-muted-foreground">{trackingNumber}</span>}
      </div>
    );
  }

  async function handleShip() {
    setPending(true);
    try {
      await markOrderShipped(orderId, tracking);
      toast.success("Marked as shipped.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update this order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Truck className="size-3.5" />
            Mark shipped
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark this order shipped</DialogTitle>
        </DialogHeader>
        <Input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking number (optional)"
        />
        <DialogFooter>
          <Button disabled={pending} onClick={handleShip}>
            {pending ? "Saving…" : "Mark shipped"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
