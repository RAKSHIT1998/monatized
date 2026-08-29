import { MAX_CART_LINES, MAX_CART_LINE_QUANTITY } from "@/lib/cart-constants";

export type CartLine = { productId: string; slug: string; quantity: number };

const CART_CHANGE_EVENT = "cart:change";

function storageKey(username: string) {
  return `monetized:cart:${username}`;
}

// localStorage throws in private-browsing/storage-disabled contexts — every
// read/write here is best-effort, never allowed to crash the page a buyer is
// shopping on.
export function getCart(username: string): CartLine[] {
  try {
    const raw = window.localStorage.getItem(storageKey(username));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.productId === "string" &&
        typeof line?.slug === "string" &&
        typeof line?.quantity === "number" &&
        line.quantity > 0,
    );
  } catch {
    return [];
  }
}

function writeCart(username: string, lines: CartLine[]) {
  try {
    window.localStorage.setItem(storageKey(username), JSON.stringify(lines));
    window.dispatchEvent(new Event(CART_CHANGE_EVENT));
  } catch {
    // Storage unavailable — the buyer just won't see their cart persist.
  }
}

export function addToCart(
  username: string,
  item: { productId: string; slug: string },
  quantity = 1,
): void {
  const lines = getCart(username);
  const existing = lines.find((line) => line.productId === item.productId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, MAX_CART_LINE_QUANTITY);
  } else if (lines.length < MAX_CART_LINES) {
    lines.push({ productId: item.productId, slug: item.slug, quantity: Math.min(quantity, MAX_CART_LINE_QUANTITY) });
  }
  writeCart(username, lines);
}

export function removeFromCart(username: string, productId: string): void {
  writeCart(
    username,
    getCart(username).filter((line) => line.productId !== productId),
  );
}

export function setQuantity(username: string, productId: string, quantity: number): void {
  const clamped = Math.max(1, Math.min(quantity, MAX_CART_LINE_QUANTITY));
  writeCart(
    username,
    getCart(username).map((line) =>
      line.productId === productId ? { ...line, quantity: clamped } : line,
    ),
  );
}

export function clearCart(username: string): void {
  try {
    window.localStorage.removeItem(storageKey(username));
    window.dispatchEvent(new Event(CART_CHANGE_EVENT));
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export function getCartCount(username: string): number {
  return getCart(username).reduce((sum, line) => sum + line.quantity, 0);
}

// Components call this once on mount to react to changes made elsewhere:
// cart:change fires from this same tab (add/remove/quantity), the native
// "storage" event fires from other tabs on the same origin.
export function subscribeToCartChanges(callback: () => void): () => void {
  window.addEventListener(CART_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
