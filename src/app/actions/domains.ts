"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { generateDomainVerificationToken, verifyDomainOwnership } from "@/lib/domains";
import { customDomainSchema } from "@/lib/validation/domain";
import { hasFeatureAccess, featureUpgradeMessage } from "@/lib/plan-features";

export type DomainFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function setCustomDomain(
  _prevState: DomainFormState,
  formData: FormData,
): Promise<DomainFormState> {
  const user = await requireOnboardedCreator();
  if (!hasFeatureAccess(user.creatorProfile.plan.key, "CUSTOM_DOMAIN")) {
    return { message: featureUpgradeMessage("CUSTOM_DOMAIN") };
  }

  const validated = customDomainSchema.safeParse({ domain: formData.get("domain") });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const { domain } = validated.data;

  const existing = await db.customDomain.findUnique({ where: { domain } });
  if (existing && existing.creatorProfileId !== user.creatorProfile.id) {
    return { errors: { domain: ["That domain is already connected to another store."] } };
  }

  await db.customDomain.upsert({
    where: { creatorProfileId: user.creatorProfile.id },
    create: {
      creatorProfileId: user.creatorProfile.id,
      domain,
      verificationToken: generateDomainVerificationToken(),
    },
    update: {
      domain,
      status: "PENDING",
      verifiedAt: null,
      verificationToken: generateDomainVerificationToken(),
    },
  });

  revalidatePath("/dashboard/domain");
  return {};
}

export async function checkCustomDomainVerification() {
  const user = await requireOnboardedCreator();
  const record = await db.customDomain.findUnique({
    where: { creatorProfileId: user.creatorProfile.id },
  });
  if (!record) throw new Error("Add a domain first.");

  const verified = await verifyDomainOwnership(record.domain, record.verificationToken);

  await db.customDomain.update({
    where: { id: record.id },
    data: verified
      ? { status: "VERIFIED", verifiedAt: new Date() }
      : { status: "FAILED", verifiedAt: null },
  });

  revalidatePath("/dashboard/domain");
  return verified;
}

export async function removeCustomDomain() {
  const user = await requireOnboardedCreator();
  await db.customDomain.deleteMany({ where: { creatorProfileId: user.creatorProfile.id } });
  revalidatePath("/dashboard/domain");
}
