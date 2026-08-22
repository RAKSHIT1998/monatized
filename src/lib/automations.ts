import "server-only";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email";
import type { Automation, AutomationTrigger } from "@/generated/prisma/client";

type AutomationContext = { customerId: string; customerEmail: string };

export async function runAutomations(
  creatorProfileId: string,
  trigger: AutomationTrigger,
  context: AutomationContext,
) {
  const automations = await db.automation.findMany({
    where: { creatorProfileId, trigger, isActive: true },
  });

  for (const automation of automations) {
    try {
      await executeAction(automation, context);
      await db.automation.update({
        where: { id: automation.id },
        data: { runCount: { increment: 1 } },
      });
    } catch (error) {
      // Never let a broken automation break the flow that triggered it.
      console.error(`Automation ${automation.id} failed:`, error);
    }
  }
}

async function executeAction(automation: Automation, context: AutomationContext) {
  if (automation.actionType === "ADD_CUSTOMER_TAG") {
    const config = automation.actionConfig as { tag?: string };
    const tag = config.tag?.trim();
    if (!tag) return;

    const customer = await db.customer.findUnique({ where: { id: context.customerId } });
    if (!customer || customer.tags.includes(tag)) return;

    await db.customer.update({
      where: { id: context.customerId },
      data: { tags: { push: tag } },
    });
    return;
  }

  if (automation.actionType === "SEND_EMAIL") {
    const config = automation.actionConfig as { subject?: string; body?: string };
    if (!config.subject || !config.body) return;

    const provider = getEmailProvider();
    let status: "SENT" | "FAILED" = "SENT";
    try {
      await provider.send({ to: context.customerEmail, subject: config.subject, text: config.body });
    } catch {
      status = "FAILED";
    }
    await db.emailLog.create({
      data: {
        customerId: context.customerId,
        toEmail: context.customerEmail,
        subject: config.subject,
        provider: provider.name,
        status,
      },
    });
  }
}
