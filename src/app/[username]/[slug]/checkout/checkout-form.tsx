"use client";

import { useActionState, useState } from "react";
import { previewCoupon, startCheckout } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

export function CheckoutForm({
  username,
  slug,
  isSubscription,
  isBooking = false,
  isPhysical = false,
  isTip = false,
  slots = [],
  amountLabel,
  suggestedTipAmount,
  currency = "INR",
  variantId,
}: {
  username: string;
  slug: string;
  isSubscription: boolean;
  isBooking?: boolean;
  isPhysical?: boolean;
  isTip?: boolean;
  slots?: string[];
  amountLabel: string;
  suggestedTipAmount?: number;
  currency?: string;
  variantId?: string;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, undefined);
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<
    { discountLabel: string; totalLabel: string } | { message: string } | null
  >(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [nameInput, setNameInput] = useState("");

  const tipPresets = suggestedTipAmount
    ? [suggestedTipAmount, suggestedTipAmount * 2, suggestedTipAmount * 5]
    : [];
  const [selectedTipPreset, setSelectedTipPreset] = useState<number | null>(tipPresets[0] ?? null);
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [useCustomTip, setUseCustomTip] = useState(false);
  const tipAmountValue = useCustomTip ? Number(customTipAmount) : selectedTipPreset;

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

  const payLabel = isTip
    ? tipAmountValue
      ? `Give ${formatMoney(Math.round(tipAmountValue * 100), currency)}`
      : "Give a tip"
    : isSubscription
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
          {variantId && <input type="hidden" name="variantId" value={variantId} />}
          {isBooking && <input type="hidden" name="startsAt" value={selectedSlot} />}
          {isTip && <input type="hidden" name="tipAmount" value={tipAmountValue ?? ""} />}
          {isPhysical && <input type="hidden" name="shippingName" value={nameInput} />}

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

          {isTip && (
            <div className="flex flex-col gap-3">
              <Label>Amount</Label>
              <div className="flex flex-wrap gap-1.5">
                {tipPresets.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedTipPreset(amount);
                      setUseCustomTip(false);
                    }}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      !useCustomTip && selectedTipPreset === amount
                        ? "border-foreground bg-foreground text-background"
                        : "hover:bg-muted"
                    }`}
                  >
                    {formatMoney(Math.round(amount * 100), currency)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomTip(true)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    useCustomTip
                      ? "border-foreground bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}
                >
                  Custom
                </button>
              </div>
              {useCustomTip && (
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  autoFocus
                  placeholder="Enter an amount"
                  value={customTipAmount}
                  onChange={(e) => setCustomTipAmount(e.target.value)}
                />
              )}
              {state?.errors?.tipAmount && (
                <p className="text-sm text-destructive">{state.errors.tipAmount[0]}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{isPhysical ? "Full name" : "Name (optional)"}</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required={isPhysical}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>

          {isPhysical && (
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Shipping address</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shippingLine1">Address line 1</Label>
                <Input id="shippingLine1" name="shippingLine1" autoComplete="address-line1" required />
                {state?.errors?.line1 && (
                  <p className="text-sm text-destructive">{state.errors.line1[0]}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shippingLine2">Address line 2 (optional)</Label>
                <Input id="shippingLine2" name="shippingLine2" autoComplete="address-line2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shippingCity">City</Label>
                  <Input id="shippingCity" name="shippingCity" autoComplete="address-level2" required />
                  {state?.errors?.city && (
                    <p className="text-sm text-destructive">{state.errors.city[0]}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shippingState">State</Label>
                  <Input id="shippingState" name="shippingState" autoComplete="address-level1" required />
                  {state?.errors?.state && (
                    <p className="text-sm text-destructive">{state.errors.state[0]}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shippingPostalCode">Postal code</Label>
                  <Input
                    id="shippingPostalCode"
                    name="shippingPostalCode"
                    autoComplete="postal-code"
                    required
                  />
                  {state?.errors?.postalCode && (
                    <p className="text-sm text-destructive">{state.errors.postalCode[0]}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shippingCountry">Country</Label>
                  <Input
                    id="shippingCountry"
                    name="shippingCountry"
                    autoComplete="country-name"
                    defaultValue="India"
                    required
                  />
                  {state?.errors?.country && (
                    <p className="text-sm text-destructive">{state.errors.country[0]}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isTip && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="buyerNote">Leave a message (optional)</Label>
              <Textarea id="buyerNote" name="buyerNote" rows={3} placeholder="Say something nice…" />
            </div>
          )}

          {!isSubscription && !isTip && (
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
            disabled={pending || (isBooking && !selectedSlot) || (isTip && !(tipAmountValue && tipAmountValue > 0))}
            className="mt-2"
          >
            {pending ? "Redirecting to payment…" : payLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
