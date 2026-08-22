import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { EditProductForm } from "./edit-product-form";
import { ProductFiles } from "./product-files";
import { ProductStatusControls } from "./product-status-controls";
import { ProductCoverUploader } from "./product-cover-uploader";
import { CourseCurriculum } from "./course-curriculum";
import { SubscribersPanel } from "./subscribers-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Edit product — Monetized",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOnboardedCreator();

  const product = await db.product.findUnique({
    where: { id },
    include: {
      digitalFiles: { orderBy: { createdAt: "asc" } },
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" } } },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { email: true } } },
      },
      _count: { select: { orderItems: true } },
    },
  });

  if (!product || product.creatorProfileId !== user.creatorProfile.id) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
          <p className="text-sm text-muted-foreground">
            monetized.com/{user.creatorProfile.username}/{product.slug}
          </p>
        </div>
        <ProductStatusControls
          productId={product.id}
          status={product.status}
          hasOrders={product._count.orderItems > 0}
        />
      </div>

      <ProductCoverUploader productId={product.id} coverImageUrl={product.coverImageUrl} />
      <EditProductForm product={product} />
      {product.type === "COURSE" && (
        <CourseCurriculum productId={product.id} modules={product.modules} />
      )}
      {product.type === "DIGITAL" && (
        <ProductFiles productId={product.id} files={product.digitalFiles} />
      )}
      {product.type === "SUBSCRIPTION" && (
        <Card>
          <CardHeader>
            <CardTitle>Subscribers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SubscribersPanel
              subscribers={product.subscriptions.map((sub) => ({
                id: sub.id,
                email: sub.customer.email,
                status: sub.status,
                currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
                cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
