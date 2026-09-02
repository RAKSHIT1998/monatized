import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Plus } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Products — Monetized",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

const TYPE_LABEL: Record<string, string> = {
  COURSE: "Course",
  SUBSCRIPTION: "Subscription",
  BOOKING: "Booking",
  PHYSICAL: "Physical",
  TIP: "Tip jar",
  DIGITAL: "Digital",
};

// A product is "low" once at or under this many units — a heads-up before
// it actually runs out, not just a "sold out" state after the fact.
const LOW_STOCK_THRESHOLD = 5;

const PAGE_SIZE = 50;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireOnboardedCreator();
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    creatorProfileId: user.creatorProfile.id,
    ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
  };

  const [products, totalCount] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            digitalFiles: true,
            orderItems: true,
            modules: true,
            subscriptions: true,
            bookings: true,
            variants: true,
          },
        },
        variants: { select: { stockQuantity: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(targetPage));
    return `/dashboard/products?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Digital products and courses you sell from your store.</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex gap-2">
            <Input name="q" defaultValue={query} placeholder="Search by title" className="w-56" />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <Link href="/dashboard/products/new" className={buttonVariants()}>
            <Plus />
            New product
          </Link>
        </div>
      </div>

      {totalCount === 0 && !query ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Sell a PDF, a course, a coaching call, a physical item or a tip jar. Whatever you add gets its own shareable checkout link."
          action={{ label: "Create a product", href: "/dashboard/products/new" }}
          hint="Six product types available"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const totalVariantStock =
                    product.variants.length > 0
                      ? product.variants.reduce((sum, v) => sum + (v.stockQuantity ?? 0), 0)
                      : null;
                  const stockLevel = product.variants.length > 0 ? totalVariantStock : product.stockQuantity;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {product.coverImageUrl ? (
                            <Image
                              src={product.coverImageUrl}
                              alt={product.title}
                              width={40}
                              height={40}
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {product.title.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="font-medium hover:underline"
                        >
                          {product.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TYPE_LABEL[product.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {product.type === "TIP" && "From "}
                        {formatMoney(product.priceAmountMinor, product.currency)}
                        {product.type === "SUBSCRIPTION" &&
                          `/${product.billingInterval === "MONTHLY" ? "mo" : "yr"}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>
                            {product.type === "COURSE" &&
                              `${product._count.modules} module${product._count.modules === 1 ? "" : "s"}`}
                            {product.type === "DIGITAL" &&
                              `${product._count.digitalFiles} file${product._count.digitalFiles === 1 ? "" : "s"}`}
                            {product.type === "SUBSCRIPTION" &&
                              `${product._count.subscriptions} subscriber${product._count.subscriptions === 1 ? "" : "s"}`}
                            {product.type === "BOOKING" &&
                              `${product._count.bookings} booking${product._count.bookings === 1 ? "" : "s"}`}
                            {product.type === "PHYSICAL" &&
                              (product._count.variants > 0
                                ? `${product._count.variants} option${product._count.variants === 1 ? "" : "s"}`
                                : product.stockQuantity === null
                                  ? "Unlimited stock"
                                  : `${product.stockQuantity} in stock`)}
                            {product.type === "TIP" &&
                              `${product._count.orderItems} tip${product._count.orderItems === 1 ? "" : "s"}`}
                          </span>
                          {product.type === "PHYSICAL" && stockLevel !== null && stockLevel === 0 && (
                            <Badge variant="destructive">Out of stock</Badge>
                          )}
                          {product.type === "PHYSICAL" &&
                            stockLevel !== null &&
                            stockLevel > 0 &&
                            stockLevel <= LOW_STOCK_THRESHOLD && <Badge variant="outline">Low stock</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{product._count.orderItems}</TableCell>
                    </TableRow>
                  );
                })}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No products match this search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={pageHref(page - 1)}
              aria-disabled={page <= 1}
              className={cn(buttonVariants({ variant: "outline" }), page <= 1 && "pointer-events-none opacity-50")}
            >
              Previous
            </Link>
            <Link
              href={pageHref(page + 1)}
              aria-disabled={page >= totalPages}
              className={cn(
                buttonVariants({ variant: "outline" }),
                page >= totalPages && "pointer-events-none opacity-50",
              )}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
