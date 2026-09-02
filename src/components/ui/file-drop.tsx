"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

// A styled replacement for a bare <input type="file">, whose native
// "Choose File / No file chosen" is the most obviously unfinished control
// in the product. This is still a real file input underneath — same name,
// same form submission, same server action — just not rendered raw.
export function FileDrop({
  name,
  accept,
  label = "Choose a file or drag it here",
  hint,
  className,
}: {
  name: string;
  accept?: string;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (!dropped || !inputRef.current) return;
        // Hand the dropped file to the real input so the form still submits
        // it the ordinary way.
        inputRef.current.files = event.dataTransfer.files;
        setFileName(dropped.name);
      }}
      className={cn(
        "rounded-xl border border-dashed transition-colors",
        dragging ? "border-primary bg-accent" : "border-input hover:border-muted-foreground/40",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 px-4 py-8 text-center"
      >
        <span
          aria-hidden
          className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full"
        >
          <UploadCloud className="size-4" />
        </span>
        <span className="text-sm font-medium">{fileName ?? label}</span>
        {hint && !fileName && (
          <span className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
            {hint}
          </span>
        )}
        {fileName && <span className="text-muted-foreground text-xs">Click to replace</span>}
      </button>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}
