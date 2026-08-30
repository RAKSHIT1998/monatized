import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreatorPlanSelect } from "./creator-plan-select";

export const metadata: Metadata = {
  title: "Creators — Monetized Admin",
};

const PAGE_SIZE = 50;

export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const where = query
    ? {
        OR: [
          { username: { contains: query, mode: "insensitive" as const } },
          { displayName: { contains: query, mode: "insensitive" as const } },
          { user: { email: { contains: query, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [creators, totalCount, plans] = await Promise.all([
    db.creatorProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        plan: { select: { id: true, name: true } },
        _count: { select: { products: true, orders: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.creatorProfile.count({ where }),
    db.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyMinor: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Creators</h1>
          <p className="text-sm text-muted-foreground">{totalCount} total</p>
        </div>
        <form className="flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Search by name, username, or email" className="w-72" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Onboarded</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.map((creator) => (
                <TableRow key={creator.id}>
                  <TableCell>
                    <p className="font-medium">{creator.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{creator.username}</p>
                  </TableCell>
                  <TableCell>{creator.user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{creator.plan.name}</Badge>
                      <CreatorPlanSelect
                        creatorProfileId={creator.id}
                        currentPlanId={creator.plan.id}
                        plans={plans}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{creator._count.products}</TableCell>
                  <TableCell>{creator._count.orders}</TableCell>
                  <TableCell>{creator.onboardingComplete ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {creator.createdAt.toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
              {creators.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No creators match &quot;{query}&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/admin/creators?q=${encodeURIComponent(query)}&page=${page - 1}`}
              aria-disabled={page <= 1}
              className={cn(buttonVariants({ variant: "outline" }), page <= 1 && "pointer-events-none opacity-50")}
            >
              Previous
            </Link>
            <Link
              href={`/admin/creators?q=${encodeURIComponent(query)}&page=${page + 1}`}
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
