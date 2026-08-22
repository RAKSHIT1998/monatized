"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteProduct, setProductStatus } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { ProductStatus } from "@/generated/prisma/enums";

const STATUS_VARIANT: Record<ProductStatus, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

export function ProductStatusControls({
  productId,
  status,
  hasOrders,
}: {
  productId: string;
  status: ProductStatus;
  hasOrders: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function changeStatus(next: ProductStatus) {
    setPending(true);
    try {
      await setProductStatus(productId, next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>

      {status === "DRAFT" && (
        <Button size="sm" disabled={pending} onClick={() => changeStatus("PUBLISHED")}>
          Publish
        </Button>
      )}
      {status === "PUBLISHED" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => changeStatus("DRAFT")}>
          Unpublish
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => changeStatus("DRAFT")}>
          Restore to draft
        </Button>
      )}
      {status !== "ARCHIVED" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => changeStatus("ARCHIVED")}>
          Archive
        </Button>
      )}
      {!hasOrders && (
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={pending}
          onClick={async () => {
            if (!window.confirm("Delete this product permanently? This can't be undone.")) return;
            setPending(true);
            try {
              await deleteProduct(productId);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Couldn't delete product.");
              setPending(false);
            }
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
