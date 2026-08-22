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
