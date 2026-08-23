"use server";

import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { getAiProvider } from "@/lib/ai";
import { formatMoney } from "@/lib/money";

export async function generateProductDescription(productId: string): Promise<string> {
  const user = await requireOnboardedCreator();
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Product not found.");
  }

  return getAiProvider().generateProductDescription({
    title: product.title,
    productType: product.type,
    priceLabel: formatMoney(product.priceAmountMinor, product.currency),
  });
}

export async function saveGeneratedDescription(productId: string, description: string) {
  const user = await requireOnboardedCreator();
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Product not found.");
  }

  await db.product.update({ where: { id: productId }, data: { description } });
}
