import "server-only";
import { db } from "@/lib/db";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function generateUniqueProductSlug(
  creatorProfileId: string,
  title: string,
  excludeProductId?: string,
) {
  const base = slugify(title) || "product";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await db.product.findUnique({
      where: { creatorProfileId_slug: { creatorProfileId, slug: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === excludeProductId) return candidate;
  }

  return `${base}-${Date.now()}`;
}
