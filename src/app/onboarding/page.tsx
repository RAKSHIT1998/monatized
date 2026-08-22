import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = {
  title: "Set up your store — Monetized",
};

export default async function OnboardingPage() {
  const user = await requireCreator();

  if (user.creatorProfile.onboardingComplete) {
    redirect("/dashboard");
  }

  const profile = await db.creatorProfile.findUniqueOrThrow({
    where: { id: user.creatorProfile.id },
    select: {
      username: true,
      displayName: true,
      bio: true,
      categories: true,
      onboardingStep: true,
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-12">
      <OnboardingWizard profile={profile} />
    </div>
  );
}
