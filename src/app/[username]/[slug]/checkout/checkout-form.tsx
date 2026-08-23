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
  isBooking = false,
  slots = [],
  amountLabel,
}: {
  username: string;
  slug: string;
  isSubscription: boolean;
  isBooking?: boolean;
  slots?: string[];
  amountLabel: string;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, undefined);
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<
    { discountLabel: string; totalLabel: string } | { message: string } | null
  >(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

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

  // Explicit locale throughout this component's date/time formatting — this
  // is a Client Component rendered on both server and client, and an
  // implicit locale can format differently in each, causing a hydration
  // mismatch that tears down and rebuilds the tree mid-interaction.
  const slotsByDay = new Map<string, string[]>();
  for (const iso of slots) {
    const dayKey = new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    slotsByDay.set(dayKey, [...(slotsByDay.get(dayKey) ?? []), iso]);
  }

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="username" value={username} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="couponCode" value={couponInput} />
          {isBooking && <input type="hidden" name="startsAt" value={selectedSlot} />}

          {isBooking && (
            <div className="flex flex-col gap-3">
              <Label>Pick a time</Label>
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No times are available right now — check back soon.
                </p>
              ) : (
                <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                  {[...slotsByDay.entries()].map(([day, isoTimes]) => (
                    <div key={day} className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{day}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {isoTimes.map((iso) => (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => setSelectedSlot(iso)}
                            className={`rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                              selectedSlot === iso
                                ? "border-foreground bg-foreground text-background"
                                : "hover:bg-muted"
                            }`}
                          >
                            {new Date(iso).toLocaleTimeString("en-IN", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

          <Button
            type="submit"
            size="lg"
            disabled={pending || (isBooking && !selectedSlot)}
            className="mt-2"
          >
            {pending ? "Redirecting to payment…" : payLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
