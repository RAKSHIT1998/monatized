"use client";

import { useState } from "react";
import { toast } from "sonner";
import { reactivateCreator, suspendCreator } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export function SuspendCreatorControls({
  creatorProfileId,
  suspended,
}: {
  creatorProfileId: string;
  suspended: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSuspend() {
    setPending(true);
    try {
      await suspendCreator(creatorProfileId, reason);
      toast.success("Store suspended.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't suspend this creator.");
    } finally {
      setPending(false);
    }
  }

  async function handleReactivate() {
    setPending(true);
    try {
      await reactivateCreator(creatorProfileId);
      toast.success("Store reactivated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't reactivate this creator.");
    } finally {
      setPending(false);
    }
  }

  if (suspended) {
    return (
      <Button type="button" variant="outline" disabled={pending} onClick={handleReactivate}>
        <ShieldCheck className="size-4" />
        {pending ? "Reactivating…" : "Reactivate store"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="destructive" />}>
        <ShieldAlert className="size-4" />
        Suspend store
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend this creator&apos;s store?</DialogTitle>
          <DialogDescription>
            Their storefront, product pages, and checkout all stop working immediately for buyers.
            This doesn&apos;t cancel their platform billing or delete any data.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (kept on file, not shown to the creator)"
          rows={3}
        />
        <DialogFooter>
          <Button variant="destructive" disabled={pending} onClick={handleSuspend}>
            {pending ? "Suspending…" : "Confirm suspension"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
