"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { getStorageDriver, buildPublicAssetKey, assetKeyToUrl } from "@/lib/storage";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_BYTES,
  storeAppearanceSchema,
} from "@/lib/validation/store";

export type StoreFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function updateStoreAppearance(
  _prevState: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const user = await requireOnboardedCreator();

  const validatedFields = storeAppearanceSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    primaryColor: formData.get("primaryColor"),
    buttonStyle: formData.get("buttonStyle"),
    instagram: formData.get("instagram") || "",
    youtube: formData.get("youtube") || "",
    tiktok: formData.get("tiktok") || "",
    twitter: formData.get("twitter") || "",
    website: formData.get("website") || "",
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { displayName, bio, primaryColor, buttonStyle, ...socials } = validatedFields.data;
  const socialLinks = Object.fromEntries(
    Object.entries(socials).filter(([, value]) => value),
  );

  await db.$transaction([
    db.creatorProfile.update({
      where: { id: user.creatorProfile.id },
      data: { displayName, bio: bio ?? null, socialLinks },
    }),
    db.storeTheme.update({
      where: { creatorProfileId: user.creatorProfile.id },
      data: { primaryColor, buttonStyle },
    }),
  ]);

  revalidatePath("/dashboard/store");
  revalidatePath(`/${user.creatorProfile.username}`);
  return {};
}

export async function uploadAvatar(formData: FormData): Promise<StoreFormState> {
  const user = await requireOnboardedCreator();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: ["Choose an image to upload."] } };
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return { errors: { file: ["Image is too large (max 5MB)."] } };
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return { errors: { file: ["Use a PNG, JPEG, WebP, or GIF image."] } };
  }

  const driver = getStorageDriver();
  const key = buildPublicAssetKey(user.creatorProfile.id, "avatar", file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await driver.upload(key, buffer, file.type);

  const profile = await db.creatorProfile.findUniqueOrThrow({
    where: { id: user.creatorProfile.id },
    select: { avatarUrl: true },
  });

  await db.creatorProfile.update({
    where: { id: user.creatorProfile.id },
    data: { avatarUrl: assetKeyToUrl(key) },
  });

  if (profile.avatarUrl?.startsWith("/api/assets/public/")) {
    await driver.remove(profile.avatarUrl.replace("/api/assets/", "")).catch(() => undefined);
  }

  revalidatePath("/dashboard/store");
  revalidatePath(`/${user.creatorProfile.username}`);
  return {};
}
