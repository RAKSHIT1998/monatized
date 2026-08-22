"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { setLessonCompletion } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import type { CourseLesson, CourseModule } from "@/generated/prisma/client";

type ModuleWithLessons = CourseModule & { lessons: CourseLesson[] };

export function CourseViewer({
  accessToken,
  courseTitle,
  creatorName,
  modules,
  completedLessonIds,
}: {
  accessToken: string;
  courseTitle: string;
  creatorName: string;
  modules: ModuleWithLessons[];
  completedLessonIds: string[];
}) {
  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    allLessons[0]?.id ?? null,
  );
  const [completed, setCompleted] = useState(new Set(completedLessonIds));
  const [pending, setPending] = useState(false);

  const selectedLesson = allLessons.find((l) => l.id === selectedLessonId) ?? null;
  const selectedIndex = allLessons.findIndex((l) => l.id === selectedLessonId);

  async function toggleComplete() {
    if (!selectedLesson) return;
    const nextCompleted = !completed.has(selectedLesson.id);
    setPending(true);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (nextCompleted) next.add(selectedLesson.id);
      else next.delete(selectedLesson.id);
      return next;
    });
    try {
      await setLessonCompletion(accessToken, selectedLesson.id, nextCompleted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update progress.");
    } finally {
      setPending(false);
    }
  }

  if (allLessons.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-xl font-semibold">{courseTitle}</h1>
        <p className="text-sm text-muted-foreground">
          This course doesn&apos;t have any lessons published yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <p className="text-xs text-muted-foreground">{creatorName}</p>
        <h1 className="text-lg font-semibold tracking-tight">{courseTitle}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {completed.size} of {allLessons.length} lessons complete
        </p>

        <nav className="mt-4 flex flex-col gap-3">
          {modules.map((courseModule) => (
            <div key={courseModule.id}>
              <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {courseModule.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {courseModule.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                      lesson.id === selectedLessonId
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {completed.has(lesson.id) ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : (
                      <Circle className="size-3.5 shrink-0 opacity-50" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {selectedLesson && (
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">{selectedLesson.title}</h2>

          {selectedLesson.contentType === "VIDEO" && selectedLesson.videoUrl ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <iframe
                src={selectedLesson.videoUrl}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {selectedLesson.textContent}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIndex <= 0}
                onClick={() => setSelectedLessonId(allLessons[selectedIndex - 1].id)}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIndex >= allLessons.length - 1}
                onClick={() => setSelectedLessonId(allLessons[selectedIndex + 1].id)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button size="sm" disabled={pending} onClick={toggleComplete}>
              {completed.has(selectedLesson.id) ? "Mark incomplete" : "Mark complete"}
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}
