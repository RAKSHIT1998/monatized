import "server-only";
import { db } from "@/lib/db";

export async function checkProductLimit(creatorProfileId: string) {
  const profile = await db.creatorProfile.findUniqueOrThrow({
    where: { id: creatorProfileId },
    select: { plan: { select: { productLimit: true, name: true } } },
  });

  if (profile.plan.productLimit === null) {
    return { allowed: true as const };
  }

  const productCount = await db.product.count({ where: { creatorProfileId } });

  if (productCount >= profile.plan.productLimit) {
    return {
      allowed: false as const,
      message: `Your ${profile.plan.name} plan is limited to ${profile.plan.productLimit} products. Upgrade to add more.`,
    };
  }

  return { allowed: true as const };
}
