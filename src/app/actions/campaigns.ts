"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { sendCampaignNow } from "@/lib/campaigns";
import { campaignSchema } from "@/lib/validation/campaign";

export type CampaignFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function createCampaign(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const user = await requireOnboardedCreator();

  const validated = campaignSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    audience: formData.get("audience"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  await db.campaign.create({
    data: { creatorProfileId: user.creatorProfile.id, ...validated.data },
  });

  revalidatePath("/dashboard/campaigns");
  return {};
}

export async function sendCampaign(campaignId: string) {
  const user = await requireOnboardedCreator();
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Campaign not found.");
  }
  if (campaign.status === "SENT") {
    throw new Error("This campaign was already sent.");
  }

  await sendCampaignNow(campaignId);
  revalidatePath("/dashboard/campaigns");
}

export async function deleteCampaign(campaignId: string) {
  const user = await requireOnboardedCreator();
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Campaign not found.");
  }

  await db.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/dashboard/campaigns");
}
