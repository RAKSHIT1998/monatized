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
import { NewAutomationForm } from "./new-automation-form";
import { AutomationRowActions } from "./automation-row-actions";

export const metadata: Metadata = {
  title: "Automations — Monetized",
};

const TRIGGER_LABEL: Record<string, string> = {
  ORDER_PAID: "Order paid",
  NEW_SUBSCRIBER: "New subscriber",
  SUBSCRIPTION_CANCELLED: "Subscription cancelled",
};

export default async function AutomationsPage() {
  const user = await requireOnboardedCreator();

  const automations = await db.automation.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
        <p className="text-sm text-muted-foreground">
          Simple rules that run automatically — tag a customer or send them an email when
          something happens.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <NewAutomationForm />

        <Card>
          <CardHeader>
            <CardTitle>Your automations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {automations.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No automations yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Then</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automations.map((automation) => {
                    const config = automation.actionConfig as {
                      tag?: string;
                      subject?: string;
                    };
                    return (
                      <TableRow key={automation.id}>
                        <TableCell>{TRIGGER_LABEL[automation.trigger]}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {automation.actionType === "ADD_CUSTOMER_TAG"
                            ? `Add tag "${config.tag}"`
                            : `Email: "${config.subject}"`}
                        </TableCell>
                        <TableCell>{automation.runCount}</TableCell>
                        <TableCell>
                          <Badge variant={automation.isActive ? "default" : "secondary"}>
                            {automation.isActive ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AutomationRowActions
                            automationId={automation.id}
                            isActive={automation.isActive}
                          />
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
