"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewCampaignForm() {
  const [state, formAction, pending] = useActionState(createCampaign, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== undefined && !state.errors && !state.message) {
      toast.success("Draft saved.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New email</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" placeholder="What's new this month" />
            {state?.errors?.subject && (
              <p className="text-sm text-destructive">{state.errors.subject[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={6} placeholder="Hey there…" />
            {state?.errors?.body && <p className="text-sm text-destructive">{state.errors.body[0]}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="audience">Send to</Label>
            <select
              id="audience"
              name="audience"
              defaultValue="ALL_CUSTOMERS"
              className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="ALL_CUSTOMERS">All customers</option>
              <option value="ACTIVE_SUBSCRIBERS">Active subscribers only</option>
            </select>
          </div>

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Saving…" : "Save draft"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
