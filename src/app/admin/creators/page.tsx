import type { Metadata } from "next";
import { db } from "@/lib/db";
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

export const metadata: Metadata = {
  title: "Creators — Monetized Admin",
};

export default async function AdminCreatorsPage() {
  const creators = await db.creatorProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
      plan: { select: { name: true } },
      _count: { select: { products: true, orders: true } },
    },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Creators</h1>

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
                    <Badge variant="secondary">{creator.plan.name}</Badge>
                  </TableCell>
                  <TableCell>{creator._count.products}</TableCell>
                  <TableCell>{creator._count.orders}</TableCell>
                  <TableCell>{creator.onboardingComplete ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {creator.createdAt.toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
