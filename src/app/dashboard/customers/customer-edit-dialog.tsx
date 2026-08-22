"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { updateCustomerDetails } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil } from "lucide-react";

export function CustomerEditDialog({
  customerId,
  email,
  tags,
  notes,
}: {
  customerId: string;
  email: string;
  tags: string[];
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await updateCustomerDetails(undefined, formData);
    if (!result?.errors && !result?.message) {
      toast.success("Customer updated.");
      setOpen(false);
    }
    return result;
  }, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="size-3.5" />
        <span className="sr-only">Edit {email}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{email}</DialogTitle>
          <DialogDescription>Tags and notes are only visible to you.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="customerId" value={customerId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" name="tags" defaultValue={tags.join(", ")} placeholder="vip, repeat" />
            {state?.errors?.tags && (
              <p className="text-sm text-destructive">{state.errors.tags[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={notes ?? ""} />
            {state?.errors?.notes && (
              <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
            )}
          </div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
