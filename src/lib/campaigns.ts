import "server-only";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email";
import type { CampaignAudience } from "@/generated/prisma/enums";

export async function resolveAudience(creatorProfileId: string, audience: CampaignAudience) {
  if (audience === "ACTIVE_SUBSCRIBERS") {
    return db.customer.findMany({
      where: {
        creatorProfileId,
        subscriptions: { some: { status: { in: ["ACTIVE", "PAST_DUE"] } } },
      },
      select: { id: true, email: true },
    });
  }

  return db.customer.findMany({
    where: { creatorProfileId },
    select: { id: true, email: true },
  });
}

/** Sends a DRAFT campaign now. Synchronous — fine at small-list/demo scale (see schema comment). */
export async function sendCampaignNow(campaignId: string) {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  if (campaign.status === "SENT") return; // idempotent

  const recipients = await resolveAudience(campaign.creatorProfileId, campaign.audience);
  const provider = getEmailProvider();

  for (const recipient of recipients) {
    try {
      await provider.send({ to: recipient.email, subject: campaign.subject, text: campaign.body });
      await db.emailLog.create({
        data: {
          campaignId: campaign.id,
          customerId: recipient.id,
          toEmail: recipient.email,
          subject: campaign.subject,
          provider: provider.name,
          status: "SENT",
        },
      });
    } catch {
      await db.emailLog.create({
        data: {
          campaignId: campaign.id,
          customerId: recipient.id,
          toEmail: recipient.email,
          subject: campaign.subject,
          provider: provider.name,
          status: "FAILED",
        },
      });
    }
  }

  await db.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENT", recipientCount: recipients.length, sentAt: new Date() },
  });
}
