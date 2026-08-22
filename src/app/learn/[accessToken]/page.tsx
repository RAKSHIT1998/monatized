import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CourseViewer } from "./course-viewer";

export const metadata: Metadata = {
  title: "Your course — Monetized",
};

export default async function LearnPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;

  const enrollment = await db.courseEnrollment.findUnique({
    where: { accessToken },
    include: {
      product: {
        include: {
          creatorProfile: { select: { displayName: true } },
          modules: {
            orderBy: { position: "asc" },
            include: { lessons: { orderBy: { position: "asc" } } },
          },
        },
      },
      completions: { select: { lessonId: true } },
    },
  });

  if (!enrollment) notFound();

  const completedLessonIds = enrollment.completions.map((c) => c.lessonId);

  return (
    <CourseViewer
      accessToken={accessToken}
      courseTitle={enrollment.product.title}
      creatorName={enrollment.product.creatorProfile.displayName}
      modules={enrollment.product.modules}
      completedLessonIds={completedLessonIds}
    />
  );
}
