"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getRecentPaidOrdersSince } from "@/app/actions/live-activity";
import { formatMoney } from "@/lib/money";

const POLL_INTERVAL_MS = 20_000;

// Polling, not a websocket/SSE push — "live" is honest about the mechanism:
// new sales show up within POLL_INTERVAL_MS of actually happening, not
// instantly. Good enough for a creator keeping the dashboard open in a tab.
export function LiveSaleNotifier() {
  const sinceRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(async () => {
      let sales;
      try {
        sales = await getRecentPaidOrdersSince(sinceRef.current);
      } catch {
        return; // A single failed poll shouldn't surface as a user-facing error.
      }
      if (sales.length === 0) return;

      sinceRef.current = new Date().toISOString();
      for (const sale of sales) {
        toast.success(`New sale! ${formatMoney(sale.amountMinor, sale.currency)}`, {
          description: `${sale.productTitle} — ${sale.customerEmail}`,
        });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return null;
}
