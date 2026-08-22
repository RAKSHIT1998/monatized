import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewCampaignForm } from "./new-campaign-form";
import { CampaignRowActions } from "./campaign-row-actions";

export const metadata: Metadata = {
  title: "Email campaigns — Monetized",
};

export default async function CampaignsPage() {
  const user = await requireOnboardedCreator();

  const campaigns = await db.campaign.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
  });

  const emailProviderLabel = process.env.EMAIL_PROVIDER === "resend" ? "Resend" : "console (dev-only)";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email campaigns</h1>
        <p className="text-sm text-muted-foreground">
          One-off emails to your customer list. Sending via: <strong>{emailProviderLabel}</strong>
          {emailProviderLabel.includes("dev-only") &&
            " — emails are logged, not actually delivered. Set EMAIL_PROVIDER=resend to send for real."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <NewCampaignForm />

        <Card>
          <CardHeader>
            <CardTitle>Your emails</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {campaigns.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No emails yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.subject}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {campaign.audience === "ALL_CUSTOMERS" ? "All customers" : "Active subscribers"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={campaign.status === "SENT" ? "default" : "secondary"}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.status === "SENT" ? campaign.recipientCount : "—"}</TableCell>
                      <TableCell>
                        <CampaignRowActions campaignId={campaign.id} status={campaign.status} />
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
