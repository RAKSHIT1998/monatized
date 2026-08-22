"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { createLesson, updateLesson } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CourseLesson } from "@/generated/prisma/client";

type LessonEditorDialogProps =
  | { mode: "create"; moduleId: string; trigger: React.ReactElement }
  | { mode: "edit"; lesson: CourseLesson; trigger: React.ReactElement };

export function LessonEditorDialog(props: LessonEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [contentType, setContentType] = useState<"VIDEO" | "TEXT">(
    props.mode === "edit" ? props.lesson.contentType : "TEXT",
  );

  const boundAction =
    props.mode === "create"
      ? (_: unknown, formData: FormData) => createLesson(props.moduleId, undefined, formData)
      : (_: unknown, formData: FormData) => updateLesson(props.lesson.id, undefined, formData);

  const [state, formAction, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (!result?.errors && !result?.message) {
      toast.success(props.mode === "create" ? "Lesson added." : "Lesson updated.");
      setOpen(false);
    }
    return result;
  }, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={props.trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Add lesson" : "Edit lesson"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              name="title"
              defaultValue={props.mode === "edit" ? props.lesson.title : ""}
              placeholder="Getting started"
            />
            {state?.errors?.title && (
              <p className="text-sm text-destructive">{state.errors.title[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson-type">Type</Label>
            <select
              id="lesson-type"
              name="contentType"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as "VIDEO" | "TEXT")}
              className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="TEXT">Text</option>
              <option value="VIDEO">Video (embed URL)</option>
            </select>
          </div>

          {contentType === "VIDEO" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="lesson-video">Embed URL</Label>
              <Input
                id="lesson-video"
                name="videoUrl"
                type="url"
                placeholder="https://www.youtube.com/embed/…"
                defaultValue={props.mode === "edit" ? (props.lesson.videoUrl ?? "") : ""}
              />
              <p className="text-xs text-muted-foreground">
                Use an embeddable link (YouTube/Vimeo &quot;embed&quot; URL), not a regular watch page link.
              </p>
              {state?.errors?.videoUrl && (
                <p className="text-sm text-destructive">{state.errors.videoUrl[0]}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="lesson-text">Content</Label>
              <Textarea
                id="lesson-text"
                name="textContent"
                rows={6}
                defaultValue={props.mode === "edit" ? (props.lesson.textContent ?? "") : ""}
              />
              {state?.errors?.textContent && (
                <p className="text-sm text-destructive">{state.errors.textContent[0]}</p>
              )}
            </div>
          )}

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
