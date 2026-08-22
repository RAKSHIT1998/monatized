"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createPost } from "@/app/actions/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewPostForm() {
  const [state, formAction, pending] = useActionState(createPost, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== undefined && !state.errors && !state.message) {
      toast.success("Post published.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New post</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="This week's update" />
            {state?.errors?.title && (
              <p className="text-sm text-destructive">{state.errors.title[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="body">Post</Label>
            <Textarea id="body" name="body" rows={5} placeholder="What's new?" />
            {state?.errors?.body && <p className="text-sm text-destructive">{state.errors.body[0]}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="membersOnly" defaultChecked />
            Members only (requires an active subscription to view)
          </label>

          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Publishing…" : "Publish post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
