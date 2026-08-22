"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteLesson, deleteModule, moveLesson, moveModule } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LessonEditorDialog } from "./lesson-editor-dialog";
import { ChevronUp, ChevronDown, Trash2, Plus, Pencil, Video, FileText } from "lucide-react";
import type { CourseLesson, CourseModule } from "@/generated/prisma/client";

type ModuleWithLessons = CourseModule & { lessons: CourseLesson[] };

export function ModuleCard({
  courseModule,
  isFirst,
  isLast,
}: {
  courseModule: ModuleWithLessons;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function move(direction: "up" | "down") {
    setPending(true);
    try {
      await moveModule(courseModule.id, direction);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't reorder module.");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteModule() {
    if (!window.confirm(`Delete "${courseModule.title}" and all its lessons?`)) return;
    setPending(true);
    try {
      await deleteModule(courseModule.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete module.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={pending || isFirst}
            onClick={() => move("up")}
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={pending || isLast}
            onClick={() => move("down")}
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </div>
        <p className="flex-1 truncate font-medium">{courseModule.title}</p>
        <Button variant="ghost" size="icon-sm" disabled={pending} onClick={handleDeleteModule}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {courseModule.lessons.map((lesson, i) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            isFirst={i === 0}
            isLast={i === courseModule.lessons.length - 1}
          />
        ))}
        {courseModule.lessons.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">No lessons yet.</p>
        )}

        <LessonEditorDialog
          mode="create"
          moduleId={courseModule.id}
          trigger={
            <Button variant="ghost" size="sm" className="w-fit">
              <Plus className="size-4" />
              Add lesson
            </Button>
          }
        />
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  isFirst,
  isLast,
}: {
  lesson: CourseLesson;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function move(direction: "up" | "down") {
    setPending(true);
    try {
      await moveLesson(lesson.id, direction);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't reorder lesson.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    setPending(true);
    try {
      await deleteLesson(lesson.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete lesson.");
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
      {lesson.contentType === "VIDEO" ? (
        <Video className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 truncate">{lesson.title}</span>
      <Badge variant="secondary" className="text-[10px]">
        {lesson.contentType}
      </Badge>
      <Button variant="ghost" size="icon-xs" disabled={pending || isFirst} onClick={() => move("up")}>
        <ChevronUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={pending || isLast}
        onClick={() => move("down")}
      >
        <ChevronDown className="size-3.5" />
      </Button>
      <LessonEditorDialog
        mode="edit"
        lesson={lesson}
        trigger={
          <Button variant="ghost" size="icon-xs" disabled={pending}>
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <Button variant="ghost" size="icon-xs" disabled={pending} onClick={handleDelete}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
