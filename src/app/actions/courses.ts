"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";
import { lessonSchema, moduleTitleSchema } from "@/lib/validation/course";

export type CourseFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

async function getOwnedProduct(productId: string, creatorProfileId: string) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.creatorProfileId !== creatorProfileId || product.type !== "COURSE") {
    return null;
  }
  return product;
}

async function getOwnedModule(moduleId: string, creatorProfileId: string) {
  const courseModule = await db.courseModule.findUnique({
    where: { id: moduleId },
    include: { product: true },
  });
  if (!courseModule || courseModule.product.creatorProfileId !== creatorProfileId) return null;
  return courseModule;
}

async function getOwnedLesson(lessonId: string, creatorProfileId: string) {
  const lesson = await db.courseLesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { product: true } } },
  });
  if (!lesson || lesson.module.product.creatorProfileId !== creatorProfileId) return null;
  return lesson;
}

function revalidateProduct(productId: string) {
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function createModule(
  productId: string,
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const user = await requireOnboardedCreator();
  const product = await getOwnedProduct(productId, user.creatorProfile.id);
  if (!product) return { message: "Course not found." };

  const validatedFields = moduleTitleSchema.safeParse({ title: formData.get("title") });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const last = await db.courseModule.findFirst({
    where: { productId },
    orderBy: { position: "desc" },
  });

  await db.courseModule.create({
    data: { productId, title: validatedFields.data.title, position: (last?.position ?? -1) + 1 },
  });

  revalidateProduct(productId);
  return {};
}

export async function deleteModule(moduleId: string) {
  const user = await requireOnboardedCreator();
  const courseModule = await getOwnedModule(moduleId, user.creatorProfile.id);
  if (!courseModule) throw new Error("Module not found.");

  await db.courseModule.delete({ where: { id: moduleId } });
  revalidateProduct(courseModule.productId);
}

export async function moveModule(moduleId: string, direction: "up" | "down") {
  const user = await requireOnboardedCreator();
  const courseModule = await getOwnedModule(moduleId, user.creatorProfile.id);
  if (!courseModule) throw new Error("Module not found.");

  const neighbor = await db.courseModule.findFirst({
    where: {
      productId: courseModule.productId,
      position: direction === "up" ? { lt: courseModule.position } : { gt: courseModule.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.courseModule.update({ where: { id: courseModule.id }, data: { position: neighbor.position } }),
    db.courseModule.update({ where: { id: neighbor.id }, data: { position: courseModule.position } }),
  ]);
  revalidateProduct(courseModule.productId);
}

export async function createLesson(
  moduleId: string,
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const user = await requireOnboardedCreator();
  const courseModule = await getOwnedModule(moduleId, user.creatorProfile.id);
  if (!courseModule) return { message: "Module not found." };

  const validatedFields = lessonSchema.safeParse({
    title: formData.get("title"),
    contentType: formData.get("contentType"),
    videoUrl: formData.get("videoUrl") || "",
    textContent: formData.get("textContent") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }
  const { title, contentType, videoUrl, textContent } = validatedFields.data;

  const last = await db.courseLesson.findFirst({ where: { moduleId }, orderBy: { position: "desc" } });

  await db.courseLesson.create({
    data: {
      moduleId,
      title,
      contentType,
      videoUrl: contentType === "VIDEO" ? videoUrl : null,
      textContent: contentType === "TEXT" ? textContent : null,
      position: (last?.position ?? -1) + 1,
    },
  });

  revalidateProduct(courseModule.productId);
  return {};
}

export async function updateLesson(
  lessonId: string,
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const user = await requireOnboardedCreator();
  const lesson = await getOwnedLesson(lessonId, user.creatorProfile.id);
  if (!lesson) return { message: "Lesson not found." };

  const validatedFields = lessonSchema.safeParse({
    title: formData.get("title"),
    contentType: formData.get("contentType"),
    videoUrl: formData.get("videoUrl") || "",
    textContent: formData.get("textContent") || undefined,
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }
  const { title, contentType, videoUrl, textContent } = validatedFields.data;

  await db.courseLesson.update({
    where: { id: lessonId },
    data: {
      title,
      contentType,
      videoUrl: contentType === "VIDEO" ? videoUrl : null,
      textContent: contentType === "TEXT" ? textContent : null,
    },
  });

  revalidateProduct(lesson.module.productId);
  return {};
}

export async function deleteLesson(lessonId: string) {
  const user = await requireOnboardedCreator();
  const lesson = await getOwnedLesson(lessonId, user.creatorProfile.id);
  if (!lesson) throw new Error("Lesson not found.");

  await db.courseLesson.delete({ where: { id: lessonId } });
  revalidateProduct(lesson.module.productId);
}

export async function moveLesson(lessonId: string, direction: "up" | "down") {
  const user = await requireOnboardedCreator();
  const lesson = await getOwnedLesson(lessonId, user.creatorProfile.id);
  if (!lesson) throw new Error("Lesson not found.");

  const neighbor = await db.courseLesson.findFirst({
    where: {
      moduleId: lesson.moduleId,
      position: direction === "up" ? { lt: lesson.position } : { gt: lesson.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.courseLesson.update({ where: { id: lesson.id }, data: { position: neighbor.position } }),
    db.courseLesson.update({ where: { id: neighbor.id }, data: { position: lesson.position } }),
  ]);
  revalidateProduct(lesson.module.productId);
}

// Student-facing — gated by the enrollment's access token, not by login (there is
// no customer account system; the token itself is the buyer's only key back in).
export async function setLessonCompletion(
  accessToken: string,
  lessonId: string,
  completed: boolean,
) {
  const enrollment = await db.courseEnrollment.findUnique({ where: { accessToken } });
  if (!enrollment) throw new Error("Invalid access link.");

  const lesson = await db.courseLesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });
  if (!lesson || lesson.module.productId !== enrollment.productId) {
    throw new Error("Lesson not found.");
  }

  if (completed) {
    await db.lessonCompletion.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId },
      update: {},
    });
  } else {
    await db.lessonCompletion.deleteMany({ where: { enrollmentId: enrollment.id, lessonId } });
  }

  revalidatePath(`/learn/${accessToken}`);
}
