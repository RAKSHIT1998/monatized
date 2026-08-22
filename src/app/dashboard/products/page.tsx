import Link from "next/link";
import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Products — Monetized",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

export default async function ProductsPage() {
  const user = await requireOnboardedCreator();

  const products = await db.product.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { digitalFiles: true, orderItems: true, modules: true, subscriptions: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Digital products and courses you sell from your store.</p>
        </div>
        <Link href="/dashboard/products/new" className={buttonVariants()}>
          <Plus />
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-medium">No products yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Sell a PDF, template, preset, or any downloadable file. Create your first product to
              get a shareable checkout link.
            </p>
            <Link
              href="/dashboard/products/new"
              className={cn(buttonVariants(), "mt-2")}
            >
              Create a product
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.type === "COURSE"
                          ? "Course"
                          : product.type === "SUBSCRIPTION"
                            ? "Subscription"
                            : "Digital"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatMoney(product.priceAmountMinor, product.currency)}
                      {product.type === "SUBSCRIPTION" &&
                        `/${product.billingInterval === "MONTHLY" ? "mo" : "yr"}`}
                    </TableCell>
                    <TableCell>
                      {product.type === "COURSE" &&
                        `${product._count.modules} module${product._count.modules === 1 ? "" : "s"}`}
                      {product.type === "DIGITAL" &&
                        `${product._count.digitalFiles} file${product._count.digitalFiles === 1 ? "" : "s"}`}
                      {product.type === "SUBSCRIPTION" &&
                        `${product._count.subscriptions} subscriber${product._count.subscriptions === 1 ? "" : "s"}`}
                    </TableCell>
                    <TableCell>{product._count.orderItems}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
