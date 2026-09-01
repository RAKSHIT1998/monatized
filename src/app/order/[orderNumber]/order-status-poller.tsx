"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const MAX_ATTEMPTS = 10;

// Webhooks usually land within a second or two of the redirect — poll briefly
// so the page updates itself instead of leaving the customer on a stale "pending" view.
export function OrderStatusPoller() {
  const router = useRouter();
  const attempts = useRef(0);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(interval);
        setStalled(true);
        return;
      }
      router.refresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  if (!stalled) return null;

  // Polling gave up without the page ever reflecting a paid/failed status —
  // give the buyer something to do instead of a page that quietly stopped
  // updating with no explanation.
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center">
      <p className="text-sm text-muted-foreground">
        Still waiting on confirmation — this can take a little longer than usual.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
          Check again
        </Button>
        <Link href="/find-order" className="text-sm font-medium underline underline-offset-4">
          Find my order
        </Link>
      </div>
    </div>
  );
}
