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
import { AvailabilityPanel } from "./availability-panel";
import { BookingsPanel } from "./bookings-panel";
import { TipsPanel } from "./tips-panel";
import { VariantsPanel } from "./variants-panel";
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
      availabilityRules: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
      variants: { orderBy: { position: "asc" } },
      bookings: {
        where: { order: { status: "PAID" } },
        orderBy: { startsAt: "desc" },
        include: { customer: { select: { email: true } } },
      },
      orderItems: {
        where: { order: { status: "PAID" } },
        orderBy: { order: { createdAt: "desc" } },
        include: { order: { include: { customer: { select: { email: true } } } } },
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
      {product.type === "PHYSICAL" && (
        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent>
            <VariantsPanel productId={product.id} variants={product.variants} />
          </CardContent>
        </Card>
      )}
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
      {product.type === "BOOKING" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityPanel productId={product.id} rules={product.availabilityRules} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BookingsPanel
                bookings={product.bookings.map((booking) => ({
                  id: booking.id,
                  email: booking.customer.email,
                  startsAt: booking.startsAt.toISOString(),
                  status: booking.status,
                }))}
              />
            </CardContent>
          </Card>
        </>
      )}
      {product.type === "TIP" && (
        <Card>
          <CardHeader>
            <CardTitle>Tips received</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TipsPanel
              tips={product.orderItems.map((item) => ({
                id: item.id,
                email: item.order.customer.email,
                amountMinor: item.priceAmountMinorSnapshot,
                currency: product.currency,
                buyerNote: item.order.buyerNote,
                createdAt: item.order.createdAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
