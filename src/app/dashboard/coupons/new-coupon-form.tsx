"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createCoupon } from "@/app/actions/coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewCouponForm() {
  const [state, formAction, pending] = useActionState(createCoupon, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== undefined && !state.errors && !state.message) {
      toast.success("Coupon created.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New coupon</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} ref={formRef} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" name="code" placeholder="LAUNCH20" className="uppercase" />
            {state?.errors?.code && (
              <p className="text-sm text-destructive">{state.errors.code[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="discountType">Type</Label>
              <select
                id="discountType"
                name="discountType"
                defaultValue="PERCENT"
                className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="PERCENT">Percent off</option>
                <option value="FIXED">Fixed amount off</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="discountValue">Value</Label>
              <Input id="discountValue" name="discountValue" type="number" min="1" placeholder="20" />
            </div>
          </div>
          {state?.errors?.discountValue && (
            <p className="-mt-2 text-sm text-destructive">{state.errors.discountValue[0]}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxRedemptions">Max uses (optional)</Label>
              <Input id="maxRedemptions" name="maxRedemptions" type="number" min="1" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="expiresAt">Expires (optional)</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
          </div>

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Creating…" : "Create coupon"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
