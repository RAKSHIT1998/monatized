import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionPayload } from "@/lib/session";

export const verifySession = cache(async () => {
  const payload = await getSessionPayload();
  if (!payload) return null;

  // Secure check: confirm the token hasn't been revoked (password change, logout-everywhere)
  // by comparing against the current tokenVersion stored in the database.
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, tokenVersion: true },
  });

  if (!user || user.tokenVersion !== payload.tokenVersion) return null;

  return { userId: user.id, role: user.role };
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      creatorProfile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          onboardingComplete: true,
          onboardingStep: true,
          plan: true,
        },
      },
    },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCreator() {
  const user = await requireUser();
  if (!user.creatorProfile) redirect("/login");
  return { ...user, creatorProfile: user.creatorProfile };
}

export async function requireOnboardedCreator() {
  const user = await requireCreator();
  if (!user.creatorProfile.onboardingComplete) redirect("/onboarding");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
