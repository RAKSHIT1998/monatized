"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Webhooks usually land within a second or two of the redirect — poll briefly
// so the page updates itself instead of leaving the customer on a stale "pending" view.
export function OrderStatusPoller() {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > 10) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
