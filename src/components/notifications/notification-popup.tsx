"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getNotificationIcon, type NotificationType } from "@/lib/notification-icons";
import type { NotificationItemData } from "./notification-item";

interface NotificationPopupProps {
  /** Whether the popup should be active (only on dashboard pages) */
  active?: boolean;
}

// Track shown notification IDs to avoid duplicates
const shownNotifications = new Set<string>();

export function NotificationPopup({ active = false }: NotificationPopupProps) {
  const prevNotificationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!active) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications?limit=5");
        if (!res.ok) return;
        const data = await res.json();
        const notifications: NotificationItemData[] = data.notifications || [];

        const prevIds = prevNotificationsRef.current;
        const currentIds = notifications.map((n) => n.id);

        // Find new notifications (ones that exist now but didn't before)
        const newNotifications = notifications.filter(
          (n) => !prevIds.includes(n.id) && !shownNotifications.has(n.id) && !n.isRead
        );

        if (newNotifications.length > 0) {
          for (const notification of newNotifications) {
            shownNotifications.add(notification.id);
            const { icon: Icon, color } = getNotificationIcon(
              notification.type as NotificationType
            );

            toast(notification.title, {
              description: notification.message,
              duration: 5000,
              icon: <Icon className={`h-4 w-4 ${color}`} />,
              action: notification.link
                ? {
                    label: "View",
                    onClick: () => {
                      window.location.href = notification.link!;
                    },
                  }
                : undefined,
            });
          }
        }

        prevNotificationsRef.current = currentIds;
      } catch {
        // silently fail
      }
    };

    // Initial fetch
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [active]);

  return null; // This component only manages toasts, renders nothing
}
