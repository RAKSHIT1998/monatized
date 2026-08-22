"use client";

import { useActionState, useState } from "react";
import { previewCoupon, startCheckout } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function CheckoutForm({
  username,
  slug,
  isSubscription,
  amountLabel,
}: {
  username: string;
  slug: string;
  isSubscription: boolean;
  amountLabel: string;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, undefined);
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<
    { discountLabel: string; totalLabel: string } | { message: string } | null
  >(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    const result = await previewCoupon(username, slug, couponInput);
    setCouponPreview(
      result.valid
        ? { discountLabel: result.discountLabel, totalLabel: result.totalLabel }
        : { message: result.message },
    );
    setCheckingCoupon(false);
  }

  const payLabel = isSubscription
    ? `Subscribe — ${amountLabel}`
    : couponPreview && "totalLabel" in couponPreview
      ? `Pay ${couponPreview.totalLabel}`
      : `Pay ${amountLabel}`;

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="username" value={username} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="couponCode" value={couponInput} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" name="name" autoComplete="name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          {!isSubscription && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="couponCodeInput">Coupon (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="couponCodeInput"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    setCouponPreview(null);
                  }}
                  placeholder="LAUNCH20"
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={checkingCoupon || !couponInput.trim()}
                  onClick={applyCoupon}
                >
                  {checkingCoupon ? "Checking…" : "Apply"}
                </Button>
              </div>
              {couponPreview && "message" in couponPreview && (
                <p className="text-sm text-destructive">{couponPreview.message}</p>
              )}
              {couponPreview && "discountLabel" in couponPreview && (
                <p className="text-sm text-emerald-600">
                  Coupon applied — you save {couponPreview.discountLabel}.
                </p>
              )}
              {state?.errors?.couponCode && (
                <p className="text-sm text-destructive">{state.errors.couponCode[0]}</p>
              )}
            </div>
          )}

          {isSubscription && (
            <p className="text-xs text-muted-foreground">
              You can cancel anytime from the membership link you&apos;ll get after subscribing.
            </p>
          )}

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Redirecting to payment…" : payLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
