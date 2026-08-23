"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCreator } from "@/lib/dal";
import { isReservedUsername } from "@/lib/username";
import { businessBasicsSchema, claimUsernameSchema } from "@/lib/validation/onboarding";

export type StepFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
    }
  | undefined;

export async function saveBusinessBasics(
  _prevState: StepFormState,
  formData: FormData,
): Promise<StepFormState> {
  const { creatorProfile } = await requireCreator();

  const validatedFields = businessBasicsSchema.safeParse({
    displayName: formData.get("displayName"),
    categories: formData.getAll("categories"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { displayName, categories } = validatedFields.data;

  await db.creatorProfile.update({
    where: { id: creatorProfile.id },
    data: {
      displayName,
      categories,
      onboardingStep: Math.max(creatorProfile.onboardingStep, 1),
    },
  });

  revalidatePath("/onboarding");
  return { success: true };
}

export async function saveUsername(
  _prevState: StepFormState,
  formData: FormData,
): Promise<StepFormState> {
  const { creatorProfile } = await requireCreator();

  const validatedFields = claimUsernameSchema.safeParse({
    username: formData.get("username"),
    bio: formData.get("bio") || undefined,
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { username, bio } = validatedFields.data;

  if (isReservedUsername(username)) {
    return { errors: { username: ["That URL is reserved. Try another."] } };
  }

  const existing = await db.creatorProfile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing && existing.id !== creatorProfile.id) {
    return { errors: { username: ["That URL is already taken."] } };
  }

  await db.creatorProfile.update({
    where: { id: creatorProfile.id },
    data: {
      username,
      bio: bio ?? null,
      onboardingStep: Math.max(creatorProfile.onboardingStep, 2),
    },
  });

  revalidatePath("/onboarding");
  return { success: true };
}

// Deliberately doesn't redirect() here — this is called directly (not via a
// <form action>) from a client component wrapped in try/catch, and
// redirect()'s internal throw would be swallowed by that catch and shown as
// a spurious error even though the redirect had already gone through. The
// caller navigates itself after a successful await instead.
export async function launchStore() {
  const user = await requireCreator();

  await db.$transaction([
    db.creatorProfile.update({
      where: { id: user.creatorProfile.id },
      data: { onboardingComplete: true, onboardingStep: 3 },
    }),
    db.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "creator.onboarding_completed",
        targetType: "CreatorProfile",
        targetId: user.creatorProfile.id,
      },
    }),
  ]);
}
