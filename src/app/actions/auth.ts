"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateUniqueUsername } from "@/lib/username";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

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

export async function logout() {
  await deleteSession();
  redirect("/login");
}
