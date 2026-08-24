"use client";

import { useActionState, useState } from "react";
import { createProduct } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProductKind = "DIGITAL" | "COURSE" | "SUBSCRIPTION" | "BOOKING" | "PHYSICAL" | "TIP";

const KIND_NOUN: Record<ProductKind, string> = {
  DIGITAL: "product",
  COURSE: "course",
  SUBSCRIPTION: "subscription",
  BOOKING: "booking type",
  PHYSICAL: "product",
  TIP: "tip jar",
};

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, undefined);
  const [type, setType] = useState<ProductKind>("DIGITAL");
  const [billingInterval, setBillingInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [durationMinutes, setDurationMinutes] = useState("30");

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="type" value={type} />
          {type === "SUBSCRIPTION" && (
            <input type="hidden" name="billingInterval" value={billingInterval} />
          )}
          {type === "BOOKING" && (
            <input type="hidden" name="bookingDurationMinutes" value={durationMinutes} />
          )}

          <div className="flex flex-col gap-2">
            <Label>What are you selling?</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  ["DIGITAL", "Digital product", "A file customers download"],
                  ["COURSE", "Course", "Modules and lessons"],
                  ["SUBSCRIPTION", "Subscription", "Recurring monthly/yearly"],
                  ["BOOKING", "Booking", "1:1 sessions on your calendar"],
                  ["PHYSICAL", "Physical product", "A shippable item you mail out"],
                  ["TIP", "Tip jar", "Let supporters give any amount"],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    type === value ? "border-primary bg-primary/5" : "hover:bg-muted",
                  )}
                >
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder={
                type === "COURSE"
                  ? "Complete Video Editing Course"
                  : type === "SUBSCRIPTION"
                    ? "VIP Membership"
                    : type === "BOOKING"
                      ? "1:1 Strategy Call"
                      : type === "PHYSICAL"
                        ? "Enamel Pin Set"
                        : type === "TIP"
                          ? "Buy me a coffee"
                          : "30-Day Fitness Plan"
              }
            />
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
              placeholder="What will your customer get?"
            />
            {state?.errors?.description && (
              <p className="text-sm text-destructive">{state.errors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="priceAmount">
                {type === "TIP" ? "Suggested amount (INR)" : "Price (INR)"}
              </Label>
              <Input
                id="priceAmount"
                name="priceAmount"
                type="number"
                min={type === "TIP" ? "1" : "0"}
                step="0.01"
                placeholder={type === "TIP" ? "100" : "499"}
              />
              {state?.errors?.priceAmount && (
                <p className="text-sm text-destructive">{state.errors.priceAmount[0]}</p>
              )}
            </div>
            {type === "PHYSICAL" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="stockQuantity">Stock (optional)</Label>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Unlimited"
                />
                {state?.errors?.stockQuantity && (
                  <p className="text-sm text-destructive">{state.errors.stockQuantity[0]}</p>
                )}
              </div>
            )}
            {type === "SUBSCRIPTION" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="billingIntervalSelect">Billing</Label>
                <select
                  id="billingIntervalSelect"
                  value={billingInterval}
                  onChange={(e) => setBillingInterval(e.target.value as "MONTHLY" | "YEARLY")}
                  className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="MONTHLY">Every month</option>
                  <option value="YEARLY">Every year</option>
                </select>
              </div>
            )}
            {type === "BOOKING" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="durationSelect">Session length</Label>
                <select
                  id="durationSelect"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
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

          {type === "DIGITAL" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">File customers receive</Label>
              <Input id="file" name="file" type="file" />
              {state?.errors?.file && (
                <p className="text-sm text-destructive">{state.errors.file[0]}</p>
              )}
            </div>
          )}
          {type === "COURSE" && (
            <p className="text-sm text-muted-foreground">
              You&apos;ll build the curriculum (modules and lessons) after creating the course.
            </p>
          )}
          {type === "SUBSCRIPTION" && (
            <p className="text-sm text-muted-foreground">
              Subscribers get a bookmarkable membership link with access to your members-only posts.
            </p>
          )}
          {type === "BOOKING" && (
            <p className="text-sm text-muted-foreground">
              You&apos;ll set your weekly availability (in UTC) after creating this booking type.
            </p>
          )}
          {type === "PHYSICAL" && (
            <p className="text-sm text-muted-foreground">
              Buyers enter a shipping address at checkout. Mark orders shipped from your Orders page.
            </p>
          )}
          {type === "TIP" && (
            <p className="text-sm text-muted-foreground">
              Supporters can pick a preset amount or enter their own — the amount above is just a
              suggestion, not a minimum.
            </p>
          )}

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending} className="mt-2 w-fit">
            {pending ? "Creating…" : `Create ${KIND_NOUN[type]}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
