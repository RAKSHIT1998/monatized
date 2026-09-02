"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormShell } from "@/components/auth/auth-form-shell";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <AuthFormShell
      title="Create your store"
      description="Start monetizing your audience in minutes. No card required."
      footer={
        <>
          Already have a store?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Alex Johnson" autoComplete="name" />
          {state?.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>
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
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" />
          {state?.errors?.password && (
            <p className="text-sm text-destructive">{state.errors.password[0]}</p>
          )}
        </div>
        {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
        <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
          {pending ? "Creating your store…" : "Create free store"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
