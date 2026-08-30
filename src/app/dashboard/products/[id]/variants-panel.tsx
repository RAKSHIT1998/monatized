"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addVariant, removeVariant, updateVariant } from "@/app/actions/product-variants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export type VariantRow = {
  id: string;
  label: string;
  stockQuantity: number | null;
};

function VariantRowItem({ variant }: { variant: VariantRow }) {
  const [stockInput, setStockInput] = useState(variant.stockQuantity?.toString() ?? "");
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("stockQuantity", stockInput);
      await updateVariant(variant.id, formData);
      toast.success(`Updated ${variant.label}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update that option.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    try {
      await removeVariant(variant.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove that option.");
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{variant.label}</span>
      <Input
        type="number"
        min="0"
        step="1"
        placeholder="Unlimited"
        value={stockInput}
        onChange={(e) => setStockInput(e.target.value)}
        className="h-8 w-28"
      />
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleSave}>
        Save
      </Button>
      <button
        type="button"
        onClick={handleRemove}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${variant.label}`}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function VariantsPanel({ productId, variants }: { productId: string; variants: VariantRow[] }) {
  const [label, setLabel] = useState("");
  const [stock, setStock] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("label", label);
      formData.set("stockQuantity", stock);
      await addVariant(productId, formData);
      setLabel("");
      setStock("");
      toast.success("Option added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add that option.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Options share this product&apos;s price — add one to track stock separately, e.g. by color
        or size. Leave stock blank for unlimited.
      </p>

      {variants.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {variants.map((variant) => (
            <VariantRowItem key={variant.id} variant={variant} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="variantLabel" className="text-xs text-muted-foreground">
            Option name
          </label>
          <Input
            id="variantLabel"
            placeholder="Red"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="variantStock" className="text-xs text-muted-foreground">
            Option stock (optional)
          </label>
          <Input
            id="variantStock"
            type="number"
            min="0"
            step="1"
            placeholder="Unlimited"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="h-9 w-28"
          />
        </div>
        <Button type="button" size="sm" disabled={pending || !label.trim()} onClick={handleAdd}>
          Add option
        </Button>
      </div>

      {variants.length === 0 && <Badge variant="secondary">No options set yet</Badge>}
    </div>
  );
}
