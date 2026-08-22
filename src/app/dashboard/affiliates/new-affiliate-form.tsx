"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createAffiliate } from "@/app/actions/affiliates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewAffiliateForm() {
  const [state, formAction, pending] = useActionState(createAffiliate, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== undefined && !state.errors && !state.message) {
      toast.success("Affiliate added.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New affiliate</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Jordan Lee" />
            {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="jordan@example.com" />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Referral code</Label>
              <Input id="code" name="code" placeholder="JORDAN20" className="uppercase" />
              {state?.errors?.code && (
                <p className="text-sm text-destructive">{state.errors.code[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="commissionPercent">Commission %</Label>
              <Input
                id="commissionPercent"
                name="commissionPercent"
                type="number"
                min="1"
                max="75"
                placeholder="15"
              />
              {state?.errors?.commissionPercent && (
                <p className="text-sm text-destructive">{state.errors.commissionPercent[0]}</p>
              )}
            </div>
          </div>

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Adding…" : "Add affiliate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
