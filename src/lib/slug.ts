import "server-only";
import { db } from "@/lib/db";

// /{username}/cart and /{username}/checkout are real static routes nested
// at the same level as /{username}/[slug] — a product slug matching either
// would be permanently unreachable (shadowed by the static route), same
// class of problem RESERVED_USERNAMES in username.ts already solves for
// usernames.
const RESERVED_PRODUCT_SLUGS = new Set(["cart", "checkout"]);

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
    if (RESERVED_PRODUCT_SLUGS.has(candidate)) continue;
    const existing = await db.product.findUnique({
      where: { creatorProfileId_slug: { creatorProfileId, slug: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === excludeProductId) return candidate;
  }

  return `${base}-${Date.now()}`;
}
