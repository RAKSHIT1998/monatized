"use client";

import { useActionState, useRef } from "react";
import { createModule } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleCard } from "./module-card";
import type { CourseLesson, CourseModule } from "@/generated/prisma/client";

type ModuleWithLessons = CourseModule & { lessons: CourseLesson[] };

export function CourseCurriculum({
  productId,
  modules,
}: {
  productId: string;
  modules: ModuleWithLessons[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    const result = await createModule(productId, undefined, formData);
    if (!result?.errors && !result?.message) {
      formRef.current?.reset();
    }
    return result;
  }, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curriculum</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {modules.map((courseModule, i) => (
          <ModuleCard
            key={courseModule.id}
            courseModule={courseModule}
            isFirst={i === 0}
            isLast={i === modules.length - 1}
          />
        ))}
        {modules.length === 0 && (
          <p className="text-sm text-muted-foreground">No modules yet — add your first one below.</p>
        )}

        <form ref={formRef} action={formAction} className="flex items-start gap-2 border-t pt-3">
          <div className="flex flex-1 flex-col gap-2">
            <Input name="title" placeholder="Module title, e.g. Getting started" />
            {state?.errors?.title && (
              <p className="text-sm text-destructive">{state.errors.title[0]}</p>
            )}
            {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Adding…" : "Add module"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
