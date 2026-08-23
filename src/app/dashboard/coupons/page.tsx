import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewCouponForm } from "./new-coupon-form";
import { CouponRowActions } from "./coupon-row-actions";

export const metadata: Metadata = {
  title: "Coupons — Monetized",
};

export default async function CouponsPage() {
  const user = await requireOnboardedCreator();

  const coupons = await db.coupon.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
  });

  const currency = user.creatorProfile.plan.currency;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
        <p className="text-sm text-muted-foreground">
          Discount codes customers can enter at checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <NewCouponForm />

        <Card>
          <CardHeader>
            <CardTitle>Your coupons</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {coupons.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No coupons yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono text-xs">{coupon.code}</TableCell>
                      <TableCell>
                        {coupon.discountType === "PERCENT"
                          ? `${coupon.discountValue}%`
                          : formatMoney(coupon.discountValue, currency)}
                      </TableCell>
                      <TableCell>
                        {coupon.redemptionCount}
                        {coupon.maxRedemptions !== null ? ` / ${coupon.maxRedemptions}` : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {coupon.expiresAt ? coupon.expiresAt.toLocaleDateString("en-IN") : "Never"}
                      </TableCell>
                      <TableCell>
                        <CouponRowActions couponId={coupon.id} isActive={coupon.isActive} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
