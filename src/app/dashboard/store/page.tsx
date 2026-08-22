import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { AvatarUploader } from "./avatar-uploader";
import { StoreAppearanceForm } from "./store-appearance-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Store editor — Monetized",
};

export default async function StoreEditorPage() {
  const user = await requireOnboardedCreator();

  const profile = await db.creatorProfile.findUniqueOrThrow({
    where: { id: user.creatorProfile.id },
    include: { theme: true },
  });

  const socialLinks = (profile.socialLinks ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Store editor</h1>
        <p className="text-sm text-muted-foreground">
          monetized.com/{profile.username} — customize how it looks to visitors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploader avatarUrl={profile.avatarUrl} displayName={profile.displayName} />
        </CardContent>
      </Card>

      <StoreAppearanceForm
        displayName={profile.displayName}
        bio={profile.bio ?? ""}
        primaryColor={profile.theme?.primaryColor ?? "#111111"}
        buttonStyle={(profile.theme?.buttonStyle as "solid" | "outline") ?? "solid"}
        socialLinks={socialLinks}
      />
    </div>
  );
}
