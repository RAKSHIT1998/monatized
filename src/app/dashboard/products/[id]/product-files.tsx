"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { addProductFile, deleteProductFile } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Trash2 } from "lucide-react";
import type { DigitalProductFile } from "@/generated/prisma/client";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function ProductFiles({
  productId,
  files,
}: {
  productId: string;
  files: DigitalProductFile[];
}) {
  const [state, formAction, pending] = useActionState(async (_: unknown, formData: FormData) => {
    return addProductFile(productId, formData);
  }, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Files</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {files.length === 0 && (
          <p className="text-sm text-muted-foreground">No files yet — add one before publishing.</p>
        )}
        {files.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}

        <form action={formAction} className="flex items-end gap-2 border-t pt-4">
          <div className="flex flex-1 flex-col gap-2">
            <Input name="file" type="file" />
            {state?.errors?.file && (
              <p className="text-sm text-destructive">{state.errors.file[0]}</p>
            )}
            {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Uploading…" : "Add file"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FileRow({ file }: { file: DigitalProductFile }) {
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.fileName}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.fileSizeBytes)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await deleteProductFile(file.id);
            toast.success("File removed.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Couldn't remove file.");
          } finally {
            setPending(false);
          }
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
