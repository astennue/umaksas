"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Settings, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NotificationItem,
  type NotificationItemData,
} from "./notification-item";

interface NotificationDropdownProps {
  onOpenPreferences?: () => void;
  onViewAll?: () => void;
  onNotificationClick?: (notification: NotificationItemData) => void;
}

export function NotificationDropdown({
  onOpenPreferences,
  onViewAll,
  onNotificationClick,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/notifications/${id}`, { method: "PUT" });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently fail
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    setIsMarkingAll(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // silently fail
    } finally {
      setIsMarkingAll(false);
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        const notification = notifications.find((n) => n.id === id);
        await fetch(`/api/notifications/${id}`, { method: "DELETE" });
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch {
        // silently fail
      }
    },
    [notifications]
  );

  const handleNotificationClick = (notification: NotificationItemData) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    onNotificationClick?.(notification);
  };

  return (
    <div className="w-80 sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[11px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
              disabled={isMarkingAll}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              {isMarkingAll ? "..." : "Mark all read"}
            </Button>
          )}
          {onOpenPreferences && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onOpenPreferences}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Content */}
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No notifications
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {onViewAll && notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
              onClick={onViewAll}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
