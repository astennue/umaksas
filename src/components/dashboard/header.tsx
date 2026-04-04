"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationPopup } from "@/components/notifications/notification-popup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sun,
  Moon,
  LogOut,
  User,
  Search,
  GraduationCap,
  Shield,
} from "lucide-react";
import Link from "next/link";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADVISER: "SA Adviser",
  HRMO: "HRMO",
  OFFICER: "Organization Officer",
  OFFICE_SUPERVISOR: "Office Supervisor",
  STUDENT_ASSISTANT: "Student Assistant",
  APPLICANT: "Applicant",
  PUBLIC_VISITOR: "Visitor",
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/applications": "Applications",
  "/dashboard/interviews": "Interviews",
  "/dashboard/student-assistants": "Student Assistants",
  "/dashboard/schedules": "Schedules",
  "/dashboard/attendance": "Attendance",
  "/dashboard/evaluations": "Evaluations",
  "/dashboard/payments": "Payments",
  "/dashboard/events": "Events",
  "/dashboard/offices": "Offices",
  "/dashboard/certificates": "Certificates",
  "/dashboard/announcements": "Announcements",
  "/dashboard/notifications": "Notifications",
  "/dashboard/content": "CMS / Content",
  "/dashboard/renewals": "Renewals",
  "/dashboard/renewal": "My Renewal",
  "/dashboard/settings": "Settings",
  "/dashboard/profile": "My Profile",
};

export function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const { unreadCount } = useNotifications({ enabled: true, unreadOnly: true, limit: 1 });
  const user = session?.user as {
    role?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
  } | undefined;

  // resolvedTheme is undefined until mounted (avoid hydration mismatch)
  const isDark = resolvedTheme === "dark";

  // Determine page title from pathname
  const pageTitle =
    pageTitles[pathname] ||
    (pathname.startsWith("/dashboard/") ? pathname.split("/").pop()?.replace(/-/g, " ") : "Dashboard");

  // Get initials for avatar
  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.name?.[0]?.toUpperCase() || "U";

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="flex h-full items-center justify-between px-4 sm:px-6">
          {/* Left side */}
          <div className="flex items-center gap-3">

            {/* Mobile logo */}
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white shadow-sm">
                <GraduationCap className="h-4 w-4" />
              </div>
            </Link>

            {/* Page title */}
            <div className="hidden lg:block">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search - hidden on mobile */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  className="h-9 w-48 lg:w-56 pl-8 text-sm bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 focus-visible:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Theme Toggle */}
            {resolvedTheme && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="h-9 w-9 text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-amber-400"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            {/* User Avatar + Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-9 px-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-blue-700 text-white text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-flex text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                    {user?.firstName || user?.name || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email || ""}
                    </p>
                    {user?.role && (
                      <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                        <Shield className="mr-1 h-2.5 w-2.5" />
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/portal-login" })}
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <NotificationPopup active={true} />
    </>
  );
}
