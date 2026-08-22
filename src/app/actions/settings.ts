"use server";

import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema } from "@/lib/validation/settings";

export type SettingsFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function changePassword(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireOnboardedCreator();

  const validatedFields = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = validatedFields.data;

  const fullUser = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true, tokenVersion: true, role: true },
  });

  const passwordMatches = await verifyPassword(currentPassword, fullUser.passwordHash);
  if (!passwordMatches) {
    return { errors: { currentPassword: ["That's not your current password."] } };
  }

  const newPasswordHash = await hashPassword(newPassword);
  const nextTokenVersion = fullUser.tokenVersion + 1;

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash, tokenVersion: nextTokenVersion },
    }),
    db.auditLog.create({
      data: { actorUserId: user.id, action: "user.password_changed", targetType: "User", targetId: user.id },
    }),
  ]);

  // Bumping tokenVersion invalidates every session, including this one — re-issue
  // immediately so the device making the change stays logged in. Every other
  // device is signed out and must log in again with the new password.
  await createSession({ userId: user.id, role: fullUser.role, tokenVersion: nextTokenVersion });

  return {};
}
