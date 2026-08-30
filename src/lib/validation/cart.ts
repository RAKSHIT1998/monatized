import * as z from "zod";
import { MAX_CART_LINES, MAX_CART_LINE_QUANTITY } from "@/lib/cart-constants";

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(MAX_CART_LINE_QUANTITY),
});

export const cartItemsSchema = z.array(cartLineSchema).min(1).max(MAX_CART_LINES);

export type CartLineInput = z.infer<typeof cartLineSchema>;

// The cart is submitted as a single hidden JSON field — parse then validate,
// never trust the shape before the schema has checked it.
export function parseCartItemsJson(raw: string): CartLineInput[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = cartItemsSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
