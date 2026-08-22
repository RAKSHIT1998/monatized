"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function ReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser — the link text is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex max-w-full items-center gap-1.5 truncate font-mono text-xs text-muted-foreground hover:text-foreground"
      title={link}
    >
      {copied ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
      <span className="truncate">{link}</span>
    </button>
  );
}
