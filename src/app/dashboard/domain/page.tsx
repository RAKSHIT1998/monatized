import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasFeatureAccess, featureLabel, minPlanFor, planDisplayName } from "@/lib/plan-features";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { DomainForm } from "./domain-form";

export const metadata: Metadata = {
  title: "Custom domain — Monetized",
};

export default async function DomainPage() {
  const user = await requireOnboardedCreator();

  if (!hasFeatureAccess(user.creatorProfile.plan.key, "CUSTOM_DOMAIN")) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Custom domain</h1>
        <UpgradePrompt
          feature={featureLabel("CUSTOM_DOMAIN")}
          minPlanName={planDisplayName(minPlanFor("CUSTOM_DOMAIN"))}
        />
      </div>
    );
  }

  const record = await db.customDomain.findUnique({
    where: { creatorProfileId: user.creatorProfile.id },
    select: { domain: true, verificationToken: true, status: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Custom domain</h1>
        <p className="text-sm text-muted-foreground">
          Use your own domain for your storefront instead of monetized.com/{user.creatorProfile.username}.
        </p>
      </div>

      <div className="max-w-lg">
        <DomainForm record={record} />
      </div>
    </div>
  );
}
