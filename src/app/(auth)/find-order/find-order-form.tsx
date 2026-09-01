"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestOrderRecovery } from "@/app/actions/order-recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FindOrderForm() {
  const [state, formAction, pending] = useActionState(requestOrderRecovery, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find your order</CardTitle>
        <CardDescription>
          Lost the link to your order, download, course, or booking? Enter the email you used at
          checkout and we&apos;ll send it back to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.message ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Sending…" : "Send me my orders"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-foreground underline underline-offset-4">
            Back home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
