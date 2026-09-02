"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormShell } from "@/components/auth/auth-form-shell";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <AuthFormShell
      title="Reset your password"
      description="Enter your email and we'll send you a link to reset your password."
      footer={
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Back to log in
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
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthFormShell>
  );
}
