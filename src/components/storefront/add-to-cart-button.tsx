"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart-client";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  username,
  productId,
  slug,
  variantId,
  disabled,
  className,
}: {
  username: string;
  productId: string;
  slug: string;
  variantId?: string;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      disabled={disabled}
      className={cn("w-full", className)}
      onClick={() => {
        addToCart(username, { productId, slug, variantId });
        toast.success("Added to cart", {
          action: {
            label: "View cart",
            onClick: () => router.push(`/${username}/cart`),
          },
        });
      }}
    >
      <ShoppingCart />
      Add to cart
    </Button>
  );
}
