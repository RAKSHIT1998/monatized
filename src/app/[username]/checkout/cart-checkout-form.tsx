"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCartSummary, previewCartCoupon, startCartCheckout } from "@/app/actions/cart";
import { getCart, type CartLine } from "@/lib/cart-client";
import { EMPTY_CART_PRICING, type CartPricing } from "@/lib/cart-pricing-types";
import { formatMoney } from "@/lib/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function CartCheckoutForm({ username }: { username: string }) {
  const [state, formAction, pending] = useActionState(startCartCheckout, undefined);
  const [localCart, setLocalCart] = useState<CartLine[]>([]);
  const [pricing, setPricing] = useState<CartPricing | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<
    { discountLabel: string; totalLabel: string } | { message: string } | null
  >(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const refresh = useCallback(() => {
    queueMicrotask(async () => {
      const cart = getCart(username);
      setLocalCart(cart);
      if (cart.length === 0) {
        setPricing(EMPTY_CART_PRICING);
        return;
      }
      setPricing(await getCartSummary(username, cart));
    });
  }, [username]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    const result = await previewCartCoupon(username, localCart, couponInput);
    setCouponPreview(
      result.valid
        ? { discountLabel: result.discountLabel, totalLabel: result.totalLabel }
        : { message: result.message },
    );
    setCheckingCoupon(false);
  }

  if (!pricing) {
    return <p className="text-sm text-muted-foreground">Loading your cart…</p>;
  }

  if (pricing.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Link href={`/${username}`} className={buttonVariants({ variant: "outline" })}>
          Continue shopping
        </Link>
      </div>
    );
  }

  const totalAmountMinor = pricing.subtotalAmountMinor + pricing.shippingFeeAmountMinor;
  const payLabel =
    couponPreview && "totalLabel" in couponPreview
      ? `Pay ${couponPreview.totalLabel}`
      : `Pay ${formatMoney(totalAmountMinor, pricing.currency)}`;

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="username" value={username} />
          <input
            type="hidden"
            name="cartItemsJson"
            value={JSON.stringify(localCart.map(({ productId, quantity }) => ({ productId, quantity })))}
          />
          <input type="hidden" name="couponCode" value={couponInput} />
          {pricing.needsShippingAddress && <input type="hidden" name="shippingName" value={nameInput} />}

          <div className="flex flex-col gap-1.5 border-b pb-4 text-sm">
            {pricing.items.map((item) => (
              <div key={item.productId} className="flex items-baseline justify-between gap-3">
                <span className="truncate">
                  {item.quantity}x {item.title}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatMoney(item.lineTotalAmountMinor, pricing.currency)}
                </span>
              </div>
            ))}
            {pricing.shippingFeeAmountMinor > 0 && (
              <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {formatMoney(pricing.shippingFeeAmountMinor, pricing.currency)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{pricing.needsShippingAddress ? "Full name" : "Name (optional)"}</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required={pricing.needsShippingAddress}
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

          {pricing.needsShippingAddress && (
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

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Redirecting to payment…" : payLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
