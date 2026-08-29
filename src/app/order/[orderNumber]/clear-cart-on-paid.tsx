"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart-client";

// Safe no-op for a single-item "Buy now" order or any order whose cart was
// already empty — this only ever clears whatever is currently stored for
// this creator's username.
export function ClearCartOnPaid({ username, paid }: { username: string; paid: boolean }) {
  useEffect(() => {
    if (paid) clearCart(username);
  }, [username, paid]);

  return null;
}
