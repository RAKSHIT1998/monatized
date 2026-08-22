import Link from "next/link";
import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewAffiliateForm } from "./new-affiliate-form";
import { AffiliateRowActions } from "./affiliate-row-actions";
import { ReferralLink } from "./referral-link";

export const metadata: Metadata = {
  title: "Affiliates — Monetized",
};

export default async function AffiliatesPage() {
  const user = await requireOnboardedCreator();

  const affiliates = await db.affiliate.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
    include: { referrals: true },
  });

  const currency = user.creatorProfile.plan.currency;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Affiliates</h1>
        <p className="text-sm text-muted-foreground">
          Partners who earn a commission for referring buyers. Commission is a running ledger you
          pay out manually — Monetized doesn&apos;t move that money for you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
        <NewAffiliateForm />

        <Card>
          <CardHeader>
            <CardTitle>Your affiliates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {affiliates.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No affiliates yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate) => {
                    const totalEarnedMinor = affiliate.referrals.reduce(
                      (sum, r) => sum + r.commissionAmountMinor,
                      0,
                    );
                    return (
                      <TableRow key={affiliate.id}>
                        <TableCell>
                          <p className="font-medium">{affiliate.name}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                            {!affiliate.isActive && <Badge variant="outline">Inactive</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ReferralLink
                            link={`${appUrl}/${user.creatorProfile.username}?ref=${affiliate.code}`}
                          />
                          <Link
                            href={`/affiliate/${affiliate.accessToken}`}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Their stats page →
                          </Link>
                        </TableCell>
                        <TableCell>{(affiliate.commissionBps / 100).toFixed(0)}%</TableCell>
                        <TableCell>{affiliate.referrals.length}</TableCell>
                        <TableCell>{formatMoney(totalEarnedMinor, currency)}</TableCell>
                        <TableCell>
                          <AffiliateRowActions affiliateId={affiliate.id} isActive={affiliate.isActive} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
