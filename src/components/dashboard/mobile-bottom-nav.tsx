"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, CheckCircle, Bell, User, DollarSign, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: [] },
  { label: "Attendance", href: "/dashboard/attendance", icon: CheckCircle, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR", "STUDENT_ASSISTANT"] },
  { label: "Payments", href: "/dashboard/payments", icon: DollarSign, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "STUDENT_ASSISTANT"] },
  { label: "SAs", href: "/dashboard/student-assistants", icon: Users, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR"] },
  { label: "Renewal", href: "/dashboard/renewal", icon: RefreshCw, roles: ["STUDENT_ASSISTANT"] },
  { label: "Alerts", href: "/dashboard/notifications", icon: Bell, roles: [] },
  { label: "Profile", href: "/dashboard/profile", icon: User, roles: [] },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "";

  // Filter items based on role (empty roles = visible to all)
  const filteredItems = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.includes(userRole)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-1px_3px_rgba(0,0,0,0.05)] dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="flex items-center justify-around px-1 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {filteredItems.slice(0, 5).map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[48px]",
                isActive
                  ? "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40"
                  : "text-gray-400 dark:text-gray-500"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
