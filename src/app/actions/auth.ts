"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generatePasswordResetToken, hashPasswordResetToken } from "@/lib/password-reset-token";
import { generateUniqueUsername } from "@/lib/username";
import { getEmailProvider } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { checkRateLimit, getClientIp, formatRetryAfter } from "@/lib/rate-limit";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export type AuthFormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const validatedFields = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password } = validatedFields.data;

  // Per-IP only — an email-based limit would be redundant with the
  // uniqueness check right below, and the actual abuse this stops is one
  // source mass-creating many different accounts, not targeting one email.
  // Deliberately generous (unlike login/reset's tighter limits): every real
  // visitor behind a shared IP (offices, campus/CGNAT) shares this same
  // budget, and — with no reverse proxy in front of local dev — so does this
  // app's entire E2E suite (~30 signups per full run, all from the one
  // "unknown" IP getClientIp() falls back to locally). Still a real ceiling
  // against a scripted flood, just not tuned as tightly as the others.
  const ip = await getClientIp();
  const ipLimit = checkRateLimit(`signup:ip:${ip}`, 50, 10 * 60 * 1000);
  if (!ipLimit.allowed) {
    return { message: `Too many signups from this connection. Try again in ${formatRetryAfter(ipLimit.retryAfterSeconds)}.` };
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const freePlan = await db.plan.findUnique({ where: { key: "FREE" } });
  if (!freePlan) {
    return { message: "Signups are temporarily unavailable. Please try again shortly." };
  }

  const passwordHash = await hashPassword(password);
  const username = await generateUniqueUsername(name || email.split("@")[0]);

  const user = await db.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CREATOR",
      },
    });

    await tx.creatorProfile.create({
      data: {
        userId: createdUser.id,
        username,
        displayName: name,
        planId: freePlan.id,
        theme: { create: {} },
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: createdUser.id,
        action: "user.signup",
        targetType: "User",
        targetId: createdUser.id,
      },
    });

    return createdUser;
  });

  await createSession({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });
  redirect("/onboarding");
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;

  // Per-email (the actual brute-force target) and per-IP (catches credential
  // stuffing across many different accounts from one source) — either limit
  // hit blocks the attempt. Checked before touching the DB/bcrypt so a flood
  // of attempts against one account can't also become a cheap way to load
  // the database or burn CPU on password hashing.
  const ip = await getClientIp();
  const emailLimit = checkRateLimit(`login:email:${email}`, 5, 15 * 60 * 1000);
  const ipLimit = checkRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  const exceededLimit = !emailLimit.allowed ? emailLimit : !ipLimit.allowed ? ipLimit : null;
  if (exceededLimit) {
    return {
      message: `Too many login attempts. Try again in ${formatRetryAfter(exceededLimit.retryAfterSeconds)}.`,
    };
  }

  const genericError: AuthFormState = { message: "Invalid email or password." };

  const user = await db.user.findUnique({
    where: { email },
    include: { creatorProfile: { select: { onboardingComplete: true } } },
  });
  if (!user) return genericError;

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) return genericError;

  await createSession({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });

  if (user.role === "ADMIN") {
    redirect("/admin");
  }
  if (!user.creatorProfile || !user.creatorProfile.onboardingComplete) {
    redirect("/onboarding");
  }
  redirect("/dashboard");
}

export type ForgotPasswordFormState = { message?: string } | undefined;

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

// Always returns the same message regardless of whether the email has an
// account or the send even succeeded — anything else would let an attacker
// enumerate registered emails one request at a time.
const GENERIC_RESET_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

export async function requestPasswordReset(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const validated = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!validated.success) {
    return { message: GENERIC_RESET_MESSAGE };
  }
  const { email } = validated.data;

  // Per-email (stops someone from email-bombing one address with reset
  // links) and per-IP (stops one source from doing that to many different
  // addresses). A rate-limit hit still returns the same generic message —
  // the limit applies whether or not the email has an account, so this
  // reveals nothing about which emails are registered.
  const ip = await getClientIp();
  const emailLimit = checkRateLimit(`reset:email:${email}`, 3, 60 * 60 * 1000);
  const ipLimit = checkRateLimit(`reset:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return { message: GENERIC_RESET_MESSAGE };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const { token, tokenHash } = generatePasswordResetToken();
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
      },
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
    const text = [
      "We received a request to reset your Monetized password.",
      "",
      `Reset it here: ${resetUrl}`,
      "",
      "This link expires in 1 hour. If you didn't request this, you can ignore this email.",
    ].join("\n");
    try {
      await getEmailProvider().send({ to: user.email, subject: "Reset your Monetized password", text });
    } catch {
      // Best-effort, and never surfaced to the caller — see GENERIC_RESET_MESSAGE above.
    }
  }

  return { message: GENERIC_RESET_MESSAGE };
}

export type ResetPasswordFormState =
  | {
      errors?: { password?: string[] };
      message?: string;
    }
  | undefined;

export async function resetPassword(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const validated = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const { token, password } = validated.data;

  const user = await db.user.findFirst({
    where: {
      passwordResetTokenHash: hashPasswordResetToken(token),
      passwordResetTokenExpiresAt: { gt: new Date() },
    },
  });
  if (!user) {
    return { message: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(password);
  const nextTokenVersion = user.tokenVersion + 1;

  await db.$transaction([
    // Bumping tokenVersion signs out every session — someone resetting a
    // password is exactly the scenario where old sessions should not survive.
    db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: nextTokenVersion,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    }),
    db.auditLog.create({
      data: { actorUserId: user.id, action: "user.password_reset", targetType: "User", targetId: user.id },
    }),
  ]);

  // Bumping tokenVersion invalidates this browser's cookie server-side, but
  // the cookie itself is still sitting in the browser with a valid signature
  // — proxy.ts's lightweight edge check only verifies that, not tokenVersion
  // against the DB, so an unremoved cookie would make it redirect an already
  // "logged in" (but now-stale) visitor away from /login in a loop. Explicitly
  // clearing it here covers the realistic case of resetting a password from a
  // browser that's still logged in elsewhere (e.g. another tab).
  await deleteSession();
  redirect("/login?reset=success");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
