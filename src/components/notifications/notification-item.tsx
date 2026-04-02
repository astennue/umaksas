"use client";

import { getNotificationIcon, type NotificationType } from "@/lib/notification-icons";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NotificationItemData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationItemData;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const { icon: Icon, color } = getNotificationIcon(notification.type);

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex items-start gap-3 p-3 transition-colors cursor-pointer",
        notification.isRead
          ? "hover:bg-muted/50"
          : "border-l-2 border-l-blue-500 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/80",
          !notification.isRead && "bg-blue-100 dark:bg-blue-900/40"
        )}
      >
        <Icon className={cn("h-4 w-4", color)} />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              notification.isRead
                ? "text-muted-foreground"
                : "font-semibold text-foreground"
            )}
          >
            {notification.title}
          </p>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {!notification.isRead && (
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  );
}
