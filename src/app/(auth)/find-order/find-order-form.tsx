"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestOrderRecovery } from "@/app/actions/order-recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormShell } from "@/components/auth/auth-form-shell";

export function FindOrderForm() {
  const [state, formAction, pending] = useActionState(requestOrderRecovery, undefined);

  return (
    <AuthFormShell
      title="Find your order"
      description="Lost the link to your order, download, course, or booking? Enter the email you used at checkout and we'll send it back to you."
      footer={
        <Link href="/" className="font-medium text-foreground underline underline-offset-4">
          Back home
        </Link>
      }
    >
      {state?.message ? (
        <p className="rounded-lg border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {state.message}
        </p>
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
          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {pending ? "Sending…" : "Send me my orders"}
          </Button>
        </form>
      )}
    </AuthFormShell>
  );
}
