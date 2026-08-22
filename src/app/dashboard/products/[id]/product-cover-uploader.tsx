"use client";

import { useActionState } from "react";
import Image from "next/image";
import { uploadProductCoverImage } from "@/app/actions/products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

export function ProductCoverUploader({
  productId,
  coverImageUrl,
}: {
  productId: string;
  coverImageUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    return uploadProductCoverImage(productId, formData);
  }, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cover image</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {coverImageUrl ? (
            <Image src={coverImageUrl} alt="" width={64} height={64} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" />
          )}
        </div>
        <form action={formAction} className="flex flex-1 items-center gap-2">
          <Input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </CardContent>
      {state?.errors?.file && (
        <CardContent className="pt-0">
          <p className="text-sm text-destructive">{state.errors.file[0]}</p>
        </CardContent>
      )}
    </Card>
  );
}
