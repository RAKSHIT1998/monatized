"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { updatePlanSchema } from "@/lib/validation/plan";

export type AdminFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function updatePlan(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const validatedFields = updatePlanSchema.safeParse({
    planId: formData.get("planId"),
    name: formData.get("name"),
    priceMonthlyMinor: formData.get("priceMonthlyMinor"),
    productLimit: formData.get("productLimit") ?? "",
    platformFeeBps: formData.get("platformFeeBps"),
    removesBranding: formData.get("removesBranding"),
    isActive: formData.get("isActive"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { planId, name, priceMonthlyMinor, productLimit, platformFeeBps, removesBranding, isActive } =
    validatedFields.data;

  await db.$transaction([
    db.plan.update({
      where: { id: planId },
      data: {
        name,
        priceMonthlyMinor,
        productLimit: productLimit === "" ? null : Number(productLimit),
        platformFeeBps,
        removesBranding,
        isActive,
      },
    }),
    db.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: "plan.updated",
        targetType: "Plan",
        targetId: planId,
      },
    }),
  ]);

  revalidatePath("/admin/plans");
  return {};
}
