"use client";

import { useState } from "react";
import { ArrowLeft, Bell, CheckCheck, Settings, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NotificationItem,
  type NotificationItemData,
} from "@/components/notifications/notification-item";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/hooks/use-notifications";
import { useConfirm } from "@/hooks/use-confirm";
import EmptyState from "@/components/ui/empty-state";
import Link from "next/link";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [showPreferences, setShowPreferences] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const { confirm, ConfirmDialog } = useConfirm();

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({
    limit: 50,
    unreadOnly: activeTab === "unread",
    interval: 30000,
  });

  const handleDeleteNotification = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Notification",
      description: "This notification will be permanently removed.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteNotification(id);
  };

  const handleMarkAllAsRead = async () => {
    const confirmed = await confirm({
      title: "Mark All as Read",
      description: "All notifications will be marked as read.",
      confirmText: "Mark all read",
    });
    if (!confirmed) return;
    markAllAsRead();
  };

  const user = session?.user as { role?: string; firstName?: string; lastName?: string } | undefined;

  return (
    <>
    <div className="mx-auto max-w-3xl">
        {/* Page Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a8a]/10 dark:bg-[#3b82f6]/10">
                <Bell className="h-5 w-5 text-[#1e3a8a] dark:text-[#3b82f6]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1e3a8a] dark:text-white">
                  Notifications
                </h1>
                <p className="text-sm text-muted-foreground">
                  Stay updated with your latest notifications
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreferences(true)}
                className="text-xs"
              >
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Preferences
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant={activeTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            All
          </Button>
          <Button
            variant={activeTab === "unread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("unread")}
          >
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Notification List */}
        <div className="rounded-lg border bg-white dark:bg-slate-900">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
              description={activeTab === "unread"
                ? "You're all caught up! No new notifications to read."
                : "You're all caught up! New notifications will appear here."}
            />
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer stats */}
        {!isLoading && notifications.length > 0 && (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              Showing {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              {activeTab === "unread" && ` · ${unreadCount} unread`}
            </p>
          </div>
        )}
      </div>

      <NotificationPreferences
        open={showPreferences}
        onOpenChange={setShowPreferences}
      />
      <ConfirmDialog />
    </>
  );
}
