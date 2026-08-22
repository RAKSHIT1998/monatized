"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { generateAffiliateAccessToken } from "@/lib/affiliates";
import { affiliateSchema } from "@/lib/validation/affiliate";

export type AffiliateFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createAffiliate(
  _prevState: AffiliateFormState,
  formData: FormData,
): Promise<AffiliateFormState> {
  const user = await requireOnboardedCreator();

  const validated = affiliateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    code: formData.get("code"),
    commissionPercent: formData.get("commissionPercent"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const { name, email, code, commissionPercent } = validated.data;

  const existing = await db.affiliate.findUnique({
    where: { creatorProfileId_code: { creatorProfileId: user.creatorProfile.id, code } },
  });
  if (existing) {
    return { errors: { code: ["That code is already in use."] } };
  }

  await db.affiliate.create({
    data: {
      creatorProfileId: user.creatorProfile.id,
      name,
      email,
      code,
      commissionBps: Math.round(commissionPercent * 100),
      accessToken: generateAffiliateAccessToken(),
    },
  });

  revalidatePath("/dashboard/affiliates");
  return {};
}

export async function setAffiliateActive(affiliateId: string, isActive: boolean) {
  const user = await requireOnboardedCreator();
  const affiliate = await db.affiliate.findUnique({ where: { id: affiliateId } });
  if (!affiliate || affiliate.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Affiliate not found.");
  }

  await db.affiliate.update({ where: { id: affiliateId }, data: { isActive } });
  revalidatePath("/dashboard/affiliates");
}
