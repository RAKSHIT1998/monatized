"use client";

import { useState } from "react";
import { toast } from "sonner";
import { refundOrder } from "@/app/actions/orders";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Undo2 } from "lucide-react";

export function RefundButton({
  orderId,
  amountMinor,
  currency,
  customerEmail,
}: {
  orderId: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleRefund() {
    setPending(true);
    try {
      await refundOrder(orderId);
      toast.success("Order refunded.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't refund this order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Undo2 className="size-3.5" />
            Refund
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund this order?</DialogTitle>
          <DialogDescription>
            This refunds {formatMoney(amountMinor, currency)} to {customerEmail} through your
            payment provider and can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" disabled={pending} onClick={handleRefund}>
            {pending ? "Refunding…" : "Refund order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
