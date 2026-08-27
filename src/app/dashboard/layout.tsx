import { requireOnboardedCreator } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedCreator();

  return (
    <DashboardShell
      displayName={user.creatorProfile.displayName}
      username={user.creatorProfile.username}
      planName={user.creatorProfile.plan.name}
      planKey={user.creatorProfile.plan.key}
    >
      {children}
    </DashboardShell>
  );
}
