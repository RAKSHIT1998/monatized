import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReferralLink } from "@/app/dashboard/affiliates/referral-link";

export const metadata: Metadata = {
  title: "Your affiliate stats — Monetized",
};

export default async function AffiliatePage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;

  const affiliate = await db.affiliate.findUnique({
    where: { accessToken },
    include: {
      creatorProfile: { select: { displayName: true, username: true, plan: { select: { currency: true } } } },
      referrals: true,
    },
  });
  if (!affiliate) notFound();

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const totalEarnedMinor = affiliate.referrals.reduce((sum, r) => sum + r.commissionAmountMinor, 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          Affiliate for {affiliate.creatorProfile.displayName}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{affiliate.name}</h1>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={affiliate.isActive ? "default" : "secondary"}>
              {affiliate.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Commission</span>
            <span className="text-sm font-medium">{(affiliate.commissionBps / 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Referrals</span>
            <span className="text-sm font-medium">{affiliate.referrals.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total earned</span>
            <span className="text-sm font-medium">
              {formatMoney(totalEarnedMinor, affiliate.creatorProfile.plan.currency)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-t pt-4">
            <span className="text-sm text-muted-foreground">Your link</span>
            <ReferralLink
              link={`${appUrl}/${affiliate.creatorProfile.username}?ref=${affiliate.code}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
