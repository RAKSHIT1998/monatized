import type { Metadata } from "next";
import Link from "next/link";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password — Monetized",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthFormShell
        title="Invalid reset link"
        description="This link is missing its reset token."
        footer={
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        }
      >
        {null}
      </AuthFormShell>
    );
  }

  return <ResetPasswordForm token={token} />;
}
