"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationItemData } from "@/components/notifications/notification-item";

interface UseNotificationsOptions {
  /** Polling interval in milliseconds (default: 30000) */
  interval?: number;
  /** Only fetch unread notifications (default: false) */
  unreadOnly?: boolean;
  /** Maximum number of notifications to fetch (default: 20) */
  limit?: number;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
}

interface UseNotificationsReturn {
  notifications: NotificationItemData[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    interval = 30000,
    unreadOnly = false,
    limit = 20,
    enabled = true,
  } = options;

  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        limit: String(limit),
        ...(unreadOnly ? { unread: "true" } : {}),
      });
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [limit, unreadOnly]);

  useEffect(() => {
    if (!enabled) return;

    fetchNotifications();
    const pollInterval = setInterval(fetchNotifications, interval);
    return () => clearInterval(pollInterval);
  }, [fetchNotifications, interval, enabled]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent("notification-update"));
    } catch {
      // silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent("notification-update"));
    } catch {
      // silently fail
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/notifications/${id}`, { method: "DELETE" });
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        window.dispatchEvent(new CustomEvent("notification-update"));
      } catch {
        // silently fail
      }
    },
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
