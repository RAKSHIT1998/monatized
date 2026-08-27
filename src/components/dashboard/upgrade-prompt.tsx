import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export function UpgradePrompt({
  feature,
  minPlanName,
}: {
  feature: string;
  minPlanName: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <p className="text-lg font-medium">{feature} is a {minPlanName} plan feature</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Upgrade your plan to unlock it for your store.
        </p>
        <Link href="/dashboard/billing" className={buttonVariants()}>
          View plans
        </Link>
      </CardContent>
    </Card>
  );
}
