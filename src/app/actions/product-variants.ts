"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { variantLabelSchema } from "@/lib/validation/product-variants";
import { stockQuantitySchema } from "@/lib/validation/product";

async function getOwnedPhysicalProduct(productId: string, creatorProfileId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { creatorProfile: { select: { username: true } } },
  });
  if (!product || product.creatorProfileId !== creatorProfileId || product.type !== "PHYSICAL") {
    return null;
  }
  return product;
}

function revalidateProductPages(productId: string, username: string, slug: string) {
  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath(`/${username}/${slug}`);
}

export async function addVariant(productId: string, formData: FormData) {
  const user = await requireOnboardedCreator();
  const product = await getOwnedPhysicalProduct(productId, user.creatorProfile.id);
  if (!product) throw new Error("Physical product not found.");

  const label = variantLabelSchema.safeParse(formData.get("label"));
  if (!label.success) {
    throw new Error(label.error.issues[0]?.message ?? "Invalid option name.");
  }
  const stock = stockQuantitySchema.safeParse(formData.get("stockQuantity"));
  if (!stock.success) {
    throw new Error(stock.error.issues[0]?.message ?? "Invalid stock count.");
  }

  const existingCount = await db.productVariant.count({ where: { productId } });
  try {
    await db.productVariant.create({
      data: { productId, label: label.data, stockQuantity: stock.data, position: existingCount },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error(`An option named "${label.data}" already exists.`);
    }
    throw error;
  }

  revalidateProductPages(productId, product.creatorProfile.username, product.slug);
}

export async function updateVariant(variantId: string, formData: FormData) {
  const user = await requireOnboardedCreator();
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { creatorProfile: { select: { username: true } } } } },
  });
  if (!variant || variant.product.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Option not found.");
  }

  const stock = stockQuantitySchema.safeParse(formData.get("stockQuantity"));
  if (!stock.success) {
    throw new Error(stock.error.issues[0]?.message ?? "Invalid stock count.");
  }

  await db.productVariant.update({ where: { id: variantId }, data: { stockQuantity: stock.data } });
  revalidateProductPages(variant.productId, variant.product.creatorProfile.username, variant.product.slug);
}

export async function removeVariant(variantId: string) {
  const user = await requireOnboardedCreator();
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { creatorProfile: { select: { username: true } } } } },
  });
  if (!variant || variant.product.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("Option not found.");
  }

  await db.productVariant.delete({ where: { id: variantId } });
  revalidateProductPages(variant.productId, variant.product.creatorProfile.username, variant.product.slug);
}
