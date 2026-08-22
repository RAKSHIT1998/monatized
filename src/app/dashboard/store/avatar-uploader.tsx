"use client";

import { useActionState } from "react";
import { uploadAvatar } from "@/app/actions/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AvatarUploader({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    return uploadAvatar(formData);
  }, undefined);

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-16">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
        <AvatarFallback className="text-lg">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <form action={formAction} className="flex flex-1 items-center gap-2">
        <Input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
      {state?.errors?.file && <p className="text-sm text-destructive">{state.errors.file[0]}</p>}
    </div>
  );
}
