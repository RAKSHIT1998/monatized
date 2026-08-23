import "server-only";
import { db } from "@/lib/db";

export async function getPublicStoreByUsername(username: string) {
  const profile = await db.creatorProfile.findUnique({
    where: { username },
    include: {
      theme: true,
      plan: { select: { removesBranding: true } },
      products: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return profile;
}

/** Resolves a verified custom domain to the creator's platform username. */
export async function resolveUsernameFromDomain(domain: string): Promise<string | null> {
  const record = await db.customDomain.findFirst({
    where: { domain, status: "VERIFIED" },
    select: { creatorProfile: { select: { username: true } } },
  });
  return record?.creatorProfile.username ?? null;
}

export async function recordStoreView(creatorProfileId: string, productId?: string) {
  try {
    await db.analyticsEvent.create({
      data: {
        creatorProfileId,
        type: productId ? "PRODUCT_VIEW" : "STORE_VIEW",
        productId,
      },
    });
  } catch {
    // Analytics is best-effort — never fail a page render over it.
  }
}
