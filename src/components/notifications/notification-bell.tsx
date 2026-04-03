"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./notification-dropdown";
import { NotificationPreferences } from "./notification-preferences";

interface NotificationBellProps {
  /** Optional className for the button */
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=true&limit=1");
      if (res.ok && mountedRef.current) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    // Poll every 30 seconds, first call via setTimeout(0) to avoid sync setState
    const timeout = setTimeout(fetchUnreadCount, 0);
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Listen for the custom event to refresh count when notifications change
  useEffect(() => {
    function handleNotificationUpdate() {
      fetchUnreadCount();
    }

    window.addEventListener("notification-update", handleNotificationUpdate);
    return () =>
      window.removeEventListener("notification-update", handleNotificationUpdate);
  }, [fetchUnreadCount]);

  const handleOpenPreferences = () => {
    setIsOpen(false);
    setShowPreferences(true);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    window.location.href = "/dashboard/notifications";
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9", className)}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
        </Button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 rounded-lg border bg-popover p-0 shadow-lg">
            <NotificationDropdown
              onOpenPreferences={handleOpenPreferences}
              onViewAll={handleViewAll}
            />
          </div>
        )}
      </div>

      <NotificationPreferences
        open={showPreferences}
        onOpenChange={setShowPreferences}
      />
    </>
  );
}
