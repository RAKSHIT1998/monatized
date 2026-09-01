"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { updatePlanSchema } from "@/lib/validation/plan";
import { getPaymentProvider } from "@/lib/payments";
import { cancelPlatformSubscriptionRecord } from "@/lib/platform-subscriptions";
import { performRefund } from "@/lib/orders";

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

// A direct admin override — bypasses payment entirely. If the creator has an
// active platform subscription, cancel it first (provider-side too,
// best-effort) so they're never left being billed for a plan they no longer
// have after an admin moves them elsewhere.
export async function setCreatorPlan(creatorProfileId: string, planId: string) {
  const admin = await requireAdmin();

  const [creator, plan] = await Promise.all([
    db.creatorProfile.findUnique({ where: { id: creatorProfileId } }),
    db.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!creator) throw new Error("Creator not found.");
  if (!plan) throw new Error("Plan not found.");

  const existingSubscription = await db.platformSubscription.findUnique({
    where: { creatorProfileId },
  });
  if (existingSubscription && existingSubscription.status !== "CANCELLED") {
    const provider = getPaymentProvider();
    if (
      existingSubscription.provider !== "MOCK" &&
      existingSubscription.providerSubscriptionId &&
      provider.cancelProviderSubscription
    ) {
      await provider.cancelProviderSubscription(existingSubscription.providerSubscriptionId);
    }
    await cancelPlatformSubscriptionRecord(existingSubscription.id);
  }

  await db.$transaction([
    db.creatorProfile.update({ where: { id: creatorProfileId }, data: { planId } }),
    db.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: "creator.plan_changed",
        targetType: "CreatorProfile",
        targetId: creatorProfileId,
        metadata: { fromPlanId: creator.planId, toPlanId: planId },
      },
    }),
  ]);

  revalidatePath("/admin/creators");
}

// Takes a creator's storefront/checkout offline entirely — every public
// query that resolves a creator by username filters on suspendedAt: null,
// so this falls through to the same "not found" handling those pages
// already have, no new branching required there.
export async function suspendCreator(creatorProfileId: string, reason: string) {
  const admin = await requireAdmin();

  await db.$transaction([
    db.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { suspendedAt: new Date(), suspensionReason: reason.trim() || null },
    }),
    db.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: "creator.suspended",
        targetType: "CreatorProfile",
        targetId: creatorProfileId,
        metadata: { reason },
      },
    }),
  ]);

  revalidatePath("/admin/creators");
  revalidatePath(`/admin/creators/${creatorProfileId}`);
}

// Same refund as the creator-facing one (actions/orders.ts) — reuses
// performRefund — but with no ownership check, for a disputed order the
// creator hasn't (or won't) act on.
export async function adminRefundOrder(orderId: string) {
  const admin = await requireAdmin();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) throw new Error("Order not found.");

  await performRefund(order, admin.id);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function reactivateCreator(creatorProfileId: string) {
  const admin = await requireAdmin();

  await db.$transaction([
    db.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { suspendedAt: null, suspensionReason: null },
    }),
    db.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: "creator.reactivated",
        targetType: "CreatorProfile",
        targetId: creatorProfileId,
      },
    }),
  ]);

  revalidatePath("/admin/creators");
  revalidatePath(`/admin/creators/${creatorProfileId}`);
}
