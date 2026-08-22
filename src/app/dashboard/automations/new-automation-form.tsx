"use client";

import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { createAutomation } from "@/app/actions/automations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewAutomationForm() {
  const [actionType, setActionType] = useState<"ADD_CUSTOMER_TAG" | "SEND_EMAIL">("ADD_CUSTOMER_TAG");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await createAutomation(undefined, formData);
    if (!result?.errors && !result?.message) {
      toast.success("Automation created.");
      formRef.current?.reset();
      setActionType("ADD_CUSTOMER_TAG");
    }
    return result;
  }, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New automation</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="actionType" value={actionType} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="trigger">When</Label>
            <select
              id="trigger"
              name="trigger"
              defaultValue="ORDER_PAID"
              className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="ORDER_PAID">An order is paid</option>
              <option value="NEW_SUBSCRIBER">Someone subscribes</option>
              <option value="SUBSCRIPTION_CANCELLED">A subscription is cancelled</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="actionTypeSelect">Then</Label>
            <select
              id="actionTypeSelect"
              value={actionType}
              onChange={(e) => setActionType(e.target.value as "ADD_CUSTOMER_TAG" | "SEND_EMAIL")}
              className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="ADD_CUSTOMER_TAG">Add a tag to the customer</option>
              <option value="SEND_EMAIL">Send them an email</option>
            </select>
          </div>

          {actionType === "ADD_CUSTOMER_TAG" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="tag">Tag</Label>
              <Input id="tag" name="tag" placeholder="vip" />
              {state?.errors?.tag && <p className="text-sm text-destructive">{state.errors.tag[0]}</p>}
            </div>
          )}

          {actionType === "SEND_EMAIL" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="Thanks for joining!" />
                {state?.errors?.subject && (
                  <p className="text-sm text-destructive">{state.errors.subject[0]}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" name="body" rows={4} placeholder="Hey there…" />
              </div>
            </>
          )}

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Creating…" : "Create automation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
