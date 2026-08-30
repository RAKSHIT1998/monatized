"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { cn } from "@/lib/utils";

type Variant = { id: string; label: string; stockQuantity: number | null };

function variantHint(variant: Variant): string | null {
  if (variant.stockQuantity === null) return null;
  if (variant.stockQuantity <= 0) return "Sold out";
  if (variant.stockQuantity <= 5) return `${variant.stockQuantity} left`;
  return null;
}

function isVariantSoldOut(variant: Variant) {
  return variant.stockQuantity !== null && variant.stockQuantity <= 0;
}

export function PhysicalVariantPicker({
  username,
  slug,
  productId,
  accent,
  variants,
}: {
  username: string;
  slug: string;
  productId: string;
  accent: string;
  variants: Variant[];
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => variants.find((v) => !isVariantSoldOut(v))?.id,
  );
  const selected = variants.find((v) => v.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {variants.map((variant) => {
          const soldOut = isVariantSoldOut(variant);
          const hint = variantHint(variant);
          return (
            <button
              key={variant.id}
              type="button"
              disabled={soldOut}
              onClick={() => setSelectedId(variant.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selectedId === variant.id
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-muted",
              )}
            >
              {variant.label}
              {hint && <span className="ml-1.5 text-xs opacity-75">({hint})</span>}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <AddToCartButton
          username={username}
          productId={productId}
          slug={slug}
          variantId={selected?.id}
          disabled={!selected}
          className="flex-1"
        />
        <Link
          href={selected ? `/${username}/${slug}/checkout?variant=${selected.id}` : "#"}
          aria-disabled={!selected}
          className={cn(
            buttonVariants({ size: "lg" }),
            "flex-1 text-white",
            !selected && "pointer-events-none opacity-50",
          )}
          style={{ backgroundColor: accent }}
        >
          Buy now
        </Link>
      </div>
    </div>
  );
}
