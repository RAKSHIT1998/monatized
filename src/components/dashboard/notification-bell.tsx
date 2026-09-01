"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  getRecentNotifications,
  markAllNotificationsRead,
  type NotificationSummary,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const POLL_INTERVAL_MS = 20_000;

// Persisted, dismissable activity feed — distinct from LiveSaleNotifier's
// ephemeral toasts, which stay useful for a creator actively watching the
// tab. Same polling posture: "live" means polled, not pushed.
export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pending, startTransition] = useTransition();

  // queueMicrotask defers the setState calls out of the effect's own
  // synchronous execution — same idiom as cart-badge.tsx's sync() — so an
  // immediate on-mount refresh doesn't trip react-hooks/set-state-in-effect.
  const refresh = useCallback(() => {
    queueMicrotask(async () => {
      try {
        const result = await getRecentNotifications();
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch {
        // A single failed poll shouldn't surface as a user-facing error.
      }
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      refresh();
    });
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) refresh();
      }}
    >
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="relative" />}>
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={pending}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </button>
            )}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex flex-col items-start gap-0.5 whitespace-normal py-2",
                !notification.readAt && "bg-muted/50",
              )}
              onClick={() => {
                if (notification.href) router.push(notification.href);
              }}
            >
              <span className="text-sm font-medium">{notification.title}</span>
              {notification.body && (
                <span className="text-xs text-muted-foreground">{notification.body}</span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
