"use client";

import { useActionState, useState } from "react";
import { createProduct } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProductKind = "DIGITAL" | "COURSE" | "SUBSCRIPTION";

const KIND_NOUN: Record<ProductKind, string> = {
  DIGITAL: "product",
  COURSE: "course",
  SUBSCRIPTION: "subscription",
};

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, undefined);
  const [type, setType] = useState<ProductKind>("DIGITAL");
  const [billingInterval, setBillingInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="type" value={type} />
          {type === "SUBSCRIPTION" && (
            <input type="hidden" name="billingInterval" value={billingInterval} />
          )}

          <div className="flex flex-col gap-2">
            <Label>What are you selling?</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  ["DIGITAL", "Digital product", "A file customers download"],
                  ["COURSE", "Course", "Modules and lessons"],
                  ["SUBSCRIPTION", "Subscription", "Recurring monthly/yearly"],
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
              <Label htmlFor="priceAmount">Price (INR)</Label>
              <Input
                id="priceAmount"
                name="priceAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="499"
              />
              {state?.errors?.priceAmount && (
                <p className="text-sm text-destructive">{state.errors.priceAmount[0]}</p>
              )}
            </div>
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
              Subscribers get a bookmarkable membership link — there&apos;s no gated content built
              in yet, so describe what members get above.
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
