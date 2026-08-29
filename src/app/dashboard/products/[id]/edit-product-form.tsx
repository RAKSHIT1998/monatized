"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProductDetails } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/generated/prisma/client";

export function EditProductForm({ product }: { product: Product }) {
  const [state, formAction, pending] = useActionState(updateProductDetails, undefined);

  useEffect(() => {
    if (state !== undefined && !state.errors && !state.message) {
      toast.success("Product updated.");
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="productId" value={product.id} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={product.title} />
            {state?.errors?.title && (
              <p className="text-sm text-destructive">{state.errors.title[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product.description ?? ""}
            />
            {state?.errors?.description && (
              <p className="text-sm text-destructive">{state.errors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="priceAmount">
                {product.type === "TIP" ? "Suggested amount (INR)" : "Price (INR)"}
              </Label>
              <Input
                id="priceAmount"
                name="priceAmount"
                type="number"
                min={product.type === "TIP" ? "1" : "0"}
                step="0.01"
                defaultValue={product.priceAmountMinor / 100}
              />
              {state?.errors?.priceAmount && (
                <p className="text-sm text-destructive">{state.errors.priceAmount[0]}</p>
              )}
            </div>
            {product.type === "PHYSICAL" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="stockQuantity">Stock (optional)</Label>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Unlimited"
                  defaultValue={product.stockQuantity ?? ""}
                />
                {state?.errors?.stockQuantity && (
                  <p className="text-sm text-destructive">{state.errors.stockQuantity[0]}</p>
                )}
              </div>
            )}
            {product.type === "SUBSCRIPTION" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="billingInterval">Billing</Label>
                <select
                  id="billingInterval"
                  name="billingInterval"
                  defaultValue={product.billingInterval ?? "MONTHLY"}
                  className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="MONTHLY">Every month</option>
                  <option value="YEARLY">Every year</option>
                </select>
              </div>
            )}
            {product.type === "BOOKING" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookingDurationMinutes">Session length</Label>
                <select
                  id="bookingDurationMinutes"
                  name="bookingDurationMinutes"
                  defaultValue={product.bookingDurationMinutes ?? 30}
                  className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            )}
          </div>

          {product.type === "PHYSICAL" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="shippingFee">Shipping fee (optional)</Label>
              <Input
                id="shippingFee"
                name="shippingFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="Free"
                defaultValue={product.shippingFeeMinor != null ? product.shippingFeeMinor / 100 : ""}
              />
              {state?.errors?.shippingFee && (
                <p className="text-sm text-destructive">{state.errors.shippingFee[0]}</p>
              )}
            </div>
          )}

          {product.type === "SUBSCRIPTION" && (
            <p className="text-xs text-muted-foreground">
              Changes only apply to new subscribers — existing members keep the price and billing
              cycle they signed up with.
            </p>
          )}

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
