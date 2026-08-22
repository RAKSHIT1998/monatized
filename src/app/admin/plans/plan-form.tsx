"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updatePlan } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plan } from "@/generated/prisma/client";

export function PlanForm({ plan }: { plan: Plan }) {
  const [state, formAction, pending] = useActionState(updatePlan, undefined);

  useEffect(() => {
    if (state !== undefined && !state.errors && !state.message) {
      toast.success(`${plan.name} plan updated.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.key}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="planId" value={plan.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`name-${plan.id}`}>Name</Label>
              <Input id={`name-${plan.id}`} name="name" defaultValue={plan.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`price-${plan.id}`}>Price / month (minor units)</Label>
              <Input
                id={`price-${plan.id}`}
                name="priceMonthlyMinor"
                type="number"
                min="0"
                defaultValue={plan.priceMonthlyMinor}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`limit-${plan.id}`}>Product limit (blank = unlimited)</Label>
              <Input
                id={`limit-${plan.id}`}
                name="productLimit"
                type="number"
                min="0"
                defaultValue={plan.productLimit ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`fee-${plan.id}`}>Platform fee (bps)</Label>
              <Input
                id={`fee-${plan.id}`}
                name="platformFeeBps"
                type="number"
                min="0"
                max="10000"
                defaultValue={plan.platformFeeBps}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch name="removesBranding" defaultChecked={plan.removesBranding} />
              Removes branding
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch name="isActive" defaultChecked={plan.isActive} />
              Active
            </label>
          </div>

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
