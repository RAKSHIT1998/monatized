"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateProductDescription, saveGeneratedDescription } from "@/app/actions/growth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DescriptionGenerator({
  products,
  aiProviderLabel,
}: {
  products: { id: string; title: string }[];
  aiProviderLabel: string;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    if (!productId) return;
    setGenerating(true);
    try {
      const result = await generateProductDescription(productId);
      setDescription(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't generate a description.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!productId || !description.trim()) return;
    setSaving(true);
    try {
      await saveGeneratedDescription(productId, description);
      toast.success("Saved to product.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save description.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product description writer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Generating via: <strong>{aiProviderLabel}</strong>
        </p>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create a product first.</p>
        ) : (
          <>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <Button type="button" variant="outline" disabled={generating} onClick={handleGenerate}>
              {generating ? "Generating…" : "Generate description"}
            </Button>

            {description && (
              <>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <Button type="button" disabled={saving} onClick={handleSave} className="w-fit">
                  {saving ? "Saving…" : "Save to product"}
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
