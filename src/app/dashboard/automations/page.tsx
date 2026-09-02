import type { Metadata } from "next";
import { requireOnboardedCreator } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasFeatureAccess, featureLabel, minPlanFor, planDisplayName } from "@/lib/plan-features";
import { FeaturePreview } from "@/components/dashboard/feature-preview";
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

type AutomationRow = {
  id: string;
  trigger: string;
  actionType: string;
  actionConfig: { tag?: string; subject?: string };
  runCount: number;
  isActive: boolean;
};

// Shown inside the locked preview so a creator can see what the screen
// actually does before paying for it. Deliberately plausible rather than
// aspirational — these are the rules people really set up first.
const SAMPLE_AUTOMATIONS: AutomationRow[] = [
  {
    id: "sample-1",
    trigger: "ORDER_PAID",
    actionType: "ADD_CUSTOMER_TAG",
    actionConfig: { tag: "buyer" },
    runCount: 128,
    isActive: true,
  },
  {
    id: "sample-2",
    trigger: "NEW_SUBSCRIBER",
    actionType: "SEND_EMAIL",
    actionConfig: { subject: "Welcome to the inner circle" },
    runCount: 41,
    isActive: true,
  },
  {
    id: "sample-3",
    trigger: "SUBSCRIPTION_CANCELLED",
    actionType: "ADD_CUSTOMER_TAG",
    actionConfig: { tag: "churned" },
    runCount: 7,
    isActive: false,
  },
];

function AutomationsView({
  automations,
  interactive,
}: {
  automations: AutomationRow[];
  interactive: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
      <NewAutomationForm />

      <Card>
        <CardHeader>
          <CardTitle>Your automations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {automations.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">No automations yet.</p>
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
                {automations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell>{TRIGGER_LABEL[automation.trigger]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {automation.actionType === "ADD_CUSTOMER_TAG"
                        ? `Add tag "${automation.actionConfig.tag}"`
                        : `Email: "${automation.actionConfig.subject}"`}
                    </TableCell>
                    <TableCell className="tabular-nums">{automation.runCount}</TableCell>
                    <TableCell>
                      <Badge variant={automation.isActive ? "default" : "secondary"}>
                        {automation.isActive ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {interactive && (
                        <AutomationRowActions
                          automationId={automation.id}
                          isActive={automation.isActive}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AutomationsPage() {
  const user = await requireOnboardedCreator();

  const header = (
    <div>
      <h1 className="text-2xl font-medium tracking-tight">Automations</h1>
      <p className="text-muted-foreground text-sm">
        Simple rules that run automatically — tag a customer or send them an email when
        something happens.
      </p>
    </div>
  );

  if (!hasFeatureAccess(user.creatorProfile.plan.key, "AUTOMATIONS")) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <FeaturePreview
          feature={featureLabel("AUTOMATIONS")}
          minPlanName={planDisplayName(minPlanFor("AUTOMATIONS"))}
          summary="Put the busywork after a sale on autopilot, so every buyer gets the same follow-up without you touching it."
          benefits={[
            "Tag buyers automatically the moment an order is paid",
            "Send a welcome email to every new subscriber",
            "Track how many times each rule has run",
          ]}
        >
          <AutomationsView automations={SAMPLE_AUTOMATIONS} interactive={false} />
        </FeaturePreview>
      </div>
    );
  }

  const automations = await db.automation.findMany({
    where: { creatorProfileId: user.creatorProfile.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      {header}
      <AutomationsView
        automations={automations.map((automation) => ({
          id: automation.id,
          trigger: automation.trigger,
          actionType: automation.actionType,
          actionConfig: automation.actionConfig as { tag?: string; subject?: string },
          runCount: automation.runCount,
          isActive: automation.isActive,
        }))}
        interactive
      />
    </div>
  );
}
