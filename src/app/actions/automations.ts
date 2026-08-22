"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { automationSchema } from "@/lib/validation/automation";

export type AutomationFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createAutomation(
  _prevState: AutomationFormState,
  formData: FormData,
): Promise<AutomationFormState> {
  const user = await requireOnboardedCreator();

  const validated = automationSchema.safeParse({
    trigger: formData.get("trigger"),
    actionType: formData.get("actionType"),
    tag: formData.get("tag") || undefined,
    subject: formData.get("subject") || undefined,
    body: formData.get("body") || undefined,
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const { trigger, actionType, tag, subject, body } = validated.data;

  const actionConfig = actionType === "ADD_CUSTOMER_TAG" ? { tag } : { subject, body };

  await db.automation.create({
    data: { creatorProfileId: user.creatorProfile.id, trigger, actionType, actionConfig },
  });

  revalidatePath("/dashboard/automations");
  return {};
}

export async function setAutomationActive(automationId: string, isActive: boolean) {
  const user = await requireOnboardedCreator();
  const automation = await db.automation.findUnique({ where: { id: automationId } });
  if (!automation || automation.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Automation not found.");
  }

  await db.automation.update({ where: { id: automationId }, data: { isActive } });
  revalidatePath("/dashboard/automations");
}

export async function deleteAutomation(automationId: string) {
  const user = await requireOnboardedCreator();
  const automation = await db.automation.findUnique({ where: { id: automationId } });
  if (!automation || automation.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Automation not found.");
  }

  await db.automation.delete({ where: { id: automationId } });
  revalidatePath("/dashboard/automations");
}
