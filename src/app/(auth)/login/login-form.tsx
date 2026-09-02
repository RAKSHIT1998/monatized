"use client";

import { useActionState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormShell } from "@/components/auth/auth-form-shell";

function ResetSuccessBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("reset") !== "success") return null;

  return (
    <p className="rounded-lg border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
      Your password has been reset. Log in with your new password.
    </p>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <AuthFormShell
      title="Log in"
      description="Welcome back — let's get to your dashboard."
      footer={
        <>
          New to Monetized?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Create a store
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <ResetSuccessBanner />
        </Suspense>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" />
            {state?.errors?.password && (
              <p className="text-sm text-destructive">{state.errors.password[0]}</p>
            )}
          </div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </div>
    </AuthFormShell>
  );
}
