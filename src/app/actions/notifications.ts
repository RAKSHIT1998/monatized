"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOnboardedCreator } from "@/lib/dal";

export type NotificationSummary = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const RECENT_LIMIT = 20;

export async function getRecentNotifications(): Promise<{
  notifications: NotificationSummary[];
  unreadCount: number;
}> {
  const user = await requireOnboardedCreator();

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { creatorProfileId: user.creatorProfile.id },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
    db.notification.count({
      where: { creatorProfileId: user.creatorProfile.id, readAt: null },
    }),
  ]);

  return { notifications, unreadCount };
}

export async function markAllNotificationsRead() {
  const user = await requireOnboardedCreator();

  await db.notification.updateMany({
    where: { creatorProfileId: user.creatorProfile.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard");
}
