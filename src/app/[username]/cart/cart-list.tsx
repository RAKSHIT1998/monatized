"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { getCart, removeFromCart, setQuantity, subscribeToCartChanges } from "@/lib/cart-client";
import { getCartSummary } from "@/app/actions/cart";
import { EMPTY_CART_PRICING, type CartPricing } from "@/lib/cart-pricing-types";
import { formatMoney } from "@/lib/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CartList({ username, accent }: { username: string; accent: string }) {
  const [pricing, setPricing] = useState<CartPricing | null>(null);

  const refresh = useCallback(() => {
    queueMicrotask(async () => {
      const localCart = getCart(username);
      if (localCart.length === 0) {
        setPricing(EMPTY_CART_PRICING);
        return;
      }
      setPricing(await getCartSummary(username, localCart));
    });
  }, [username]);

  useEffect(() => {
    refresh();
    return subscribeToCartChanges(refresh);
  }, [refresh]);

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

  return (
    <div className="flex flex-col gap-4">
      {pricing.droppedCount > 0 && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {pricing.droppedCount} item{pricing.droppedCount === 1 ? "" : "s"} in your cart{" "}
          {pricing.droppedCount === 1 ? "is" : "are"} no longer available and{" "}
          {pricing.droppedCount === 1 ? "was" : "were"} removed.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {pricing.items.map((item) => {
          const maxQty = item.stockQuantity ?? Infinity;
          return (
            <div key={item.productId} className="flex items-center gap-3 rounded-xl border p-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">
                    {item.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(item.unitPriceAmountMinor, pricing.currency)}
                  {item.type === "PHYSICAL" && item.stockQuantity !== null && (
                    <span className="ml-1.5">({item.stockQuantity} left)</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Decrease quantity of ${item.title}`}
                  disabled={item.quantity <= 1}
                  onClick={() => setQuantity(username, item.productId, item.quantity - 1)}
                >
                  <Minus />
                </Button>
                <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Increase quantity of ${item.title}`}
                  disabled={item.quantity >= maxQty}
                  onClick={() => setQuantity(username, item.productId, item.quantity + 1)}
                >
                  <Plus />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="ml-1 text-destructive"
                  aria-label={`Remove ${item.title} from cart`}
                  onClick={() => removeFromCart(username, item.productId)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatMoney(pricing.subtotalAmountMinor, pricing.currency)}</span>
        </div>
        {pricing.shippingFeeAmountMinor > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span>{formatMoney(pricing.shippingFeeAmountMinor, pricing.currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(totalAmountMinor, pricing.currency)}</span>
        </div>
      </div>

      <Link
        href={`/${username}/checkout`}
        className={cn(buttonVariants({ size: "lg" }), "w-full text-white")}
        style={{ backgroundColor: accent }}
      >
        Checkout
      </Link>
    </div>
  );
}
