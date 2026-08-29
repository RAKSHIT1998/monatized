"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCartCount, subscribeToCartChanges } from "@/lib/cart-client";

export function CartBadge({ username }: { username: string }) {
  // Starts at 0 on the server render, then hydrates from localStorage —
  // avoids ever showing a stale/wrong count from the client cache.
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => queueMicrotask(() => setCount(getCartCount(username)));
    sync();
    return subscribeToCartChanges(sync);
  }, [username]);

  if (count === 0) return null;

  return (
    <Link
      href={`/${username}/cart`}
      className="fixed top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted"
    >
      <ShoppingCart className="size-4" />
      {count}
    </Link>
  );
}
