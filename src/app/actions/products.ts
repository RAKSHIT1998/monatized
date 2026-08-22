"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { getStorageDriver, buildProductFileKey, buildPublicAssetKey, assetKeyToUrl } from "@/lib/storage";
import { generateUniqueProductSlug } from "@/lib/slug";
import { checkProductLimit } from "@/lib/plan-limits";
import { toMinorUnits } from "@/lib/money";
import { MAX_PRODUCT_FILE_BYTES, productDetailsSchema } from "@/lib/validation/product";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_FILE_BYTES } from "@/lib/validation/store";

export type ProductFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

async function getOwnedProduct(productId: string, creatorProfileId: string) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.creatorProfileId !== creatorProfileId) {
    return null;
  }
  return product;
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireOnboardedCreator();
  const creatorProfileId = user.creatorProfile.id;

  const limit = await checkProductLimit(creatorProfileId);
  if (!limit.allowed) {
    return { message: limit.message };
  }

  const rawType = formData.get("type");
  const type = rawType === "COURSE" ? "COURSE" : rawType === "SUBSCRIPTION" ? "SUBSCRIPTION" : "DIGITAL";

  const validatedFields = productDetailsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priceAmount: formData.get("priceAmount"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  let file: File | null = null;
  if (type === "DIGITAL") {
    const candidate = formData.get("file");
    if (!(candidate instanceof File) || candidate.size === 0) {
      return { errors: { file: ["Attach the file customers will receive."] } };
    }
    if (candidate.size > MAX_PRODUCT_FILE_BYTES) {
      return { errors: { file: ["File is too large (max 500MB)."] } };
    }
    file = candidate;
  }

  const billingInterval = formData.get("billingInterval") === "YEARLY" ? "YEARLY" : "MONTHLY";

  const { title, description, priceAmount } = validatedFields.data;
  const slug = await generateUniqueProductSlug(creatorProfileId, title);

  const product = await db.product.create({
    data: {
      creatorProfileId,
      type,
      title,
      slug,
      description,
      priceAmountMinor: toMinorUnits(priceAmount),
      billingInterval: type === "SUBSCRIPTION" ? billingInterval : null,
      status: "DRAFT",
    },
  });

  if (file) {
    const storageKey = buildProductFileKey(creatorProfileId, product.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await getStorageDriver().upload(storageKey, buffer, file.type || "application/octet-stream");

    await db.digitalProductFile.create({
      data: {
        productId: product.id,
        fileName: file.name,
        storageKey,
        fileSizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });
  }

  revalidatePath("/dashboard/products");
  redirect(`/dashboard/products/${product.id}`);
}

export async function updateProductDetails(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireOnboardedCreator();
  const productId = String(formData.get("productId"));

  const product = await getOwnedProduct(productId, user.creatorProfile.id);
  if (!product) return { message: "Product not found." };

  const validatedFields = productDetailsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priceAmount: formData.get("priceAmount"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description, priceAmount } = validatedFields.data;
  const billingInterval = formData.get("billingInterval");

  await db.product.update({
    where: { id: productId },
    data: {
      title,
      description,
      priceAmountMinor: toMinorUnits(priceAmount),
      ...(product.type === "SUBSCRIPTION" && (billingInterval === "MONTHLY" || billingInterval === "YEARLY")
        ? { billingInterval }
        : {}),
    },
  });

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
  return {};
}

export async function setProductStatus(productId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const user = await requireOnboardedCreator();
  const product = await getOwnedProduct(productId, user.creatorProfile.id);
  if (!product) throw new Error("Product not found.");

  if (status === "PUBLISHED") {
    if (product.type === "COURSE") {
      const lessonCount = await db.courseLesson.count({ where: { module: { productId } } });
      if (lessonCount === 0) {
        throw new Error("Add at least one lesson before publishing this course.");
      }
    } else if (product.type === "DIGITAL") {
      const fileCount = await db.digitalProductFile.count({ where: { productId } });
      if (fileCount === 0) {
        throw new Error("Add a file before publishing this product.");
      }
    }
  }

  await db.product.update({ where: { id: productId }, data: { status } });
  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products");
}

export async function deleteProduct(productId: string) {
  const user = await requireOnboardedCreator();
  const product = await getOwnedProduct(productId, user.creatorProfile.id);
  if (!product) throw new Error("Product not found.");

  const orderCount = await db.orderItem.count({ where: { productId } });
  if (orderCount > 0) {
    throw new Error("This product has orders and can't be deleted — archive it instead.");
  }

  const files = await db.digitalProductFile.findMany({ where: { productId } });
  const driver = getStorageDriver();
  await Promise.all(files.map((f) => driver.remove(f.storageKey)));

  await db.product.delete({ where: { id: productId } });
  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function addProductFile(productId: string, formData: FormData): Promise<ProductFormState> {
  const user = await requireOnboardedCreator();
  const product = await getOwnedProduct(productId, user.creatorProfile.id);
  if (!product) return { message: "Product not found." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: ["Choose a file to upload."] } };
  }
  if (file.size > MAX_PRODUCT_FILE_BYTES) {
    return { errors: { file: ["File is too large (max 500MB)."] } };
  }

  const storageKey = buildProductFileKey(user.creatorProfile.id, productId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await getStorageDriver().upload(storageKey, buffer, file.type || "application/octet-stream");

  await db.digitalProductFile.create({
    data: {
      productId,
      fileName: file.name,
      storageKey,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
    },
  });

  revalidatePath(`/dashboard/products/${productId}`);
  return {};
}

export async function deleteProductFile(fileId: string) {
  const user = await requireOnboardedCreator();
  const file = await db.digitalProductFile.findUnique({
    where: { id: fileId },
    include: { product: true },
  });
  if (!file || file.product.creatorProfileId !== user.creatorProfile.id) {
    throw new Error("File not found.");
  }

  try {
    await db.digitalProductFile.delete({ where: { id: fileId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new Error("This file has already been delivered to a customer and can't be removed.");
    }
    throw error;
  }

  await getStorageDriver().remove(file.storageKey);
  revalidatePath(`/dashboard/products/${file.productId}`);
}

export async function uploadProductCoverImage(
  productId: string,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireOnboardedCreator();
  const product = await getOwnedProduct(productId, user.creatorProfile.id);
  if (!product) return { message: "Product not found." };

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
  const key = buildPublicAssetKey(user.creatorProfile.id, "product-cover", file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await driver.upload(key, buffer, file.type);

  await db.product.update({ where: { id: productId }, data: { coverImageUrl: assetKeyToUrl(key) } });

  if (product.coverImageUrl?.startsWith("/api/assets/public/")) {
    await driver.remove(product.coverImageUrl.replace("/api/assets/", "")).catch(() => undefined);
  }

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath(`/${user.creatorProfile.username}`);
  return {};
}
