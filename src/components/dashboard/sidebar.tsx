"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  ClipboardCheck,
  DollarSign,
  CalendarPlus,
  Building2,
  Award,
  Bell,
  Wallet,
  User,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Settings,
  PenSquare,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useUserPhoto } from "@/hooks/use-user-photo";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: string[]; // Empty array = visible to all authenticated roles
}

const navItems: NavItem[] = [
  // Dashboard - visible to all
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: [] },

  // My Profile - visible to all authenticated users
  { label: "My Profile", href: "/dashboard/profile", icon: User, roles: [] },

  // Applications - Super Admin, Adviser only
  { label: "Applications", href: "/dashboard/applications", icon: FileText, roles: ["SUPER_ADMIN", "ADVISER"] },

  // Interviews - Super Admin, Adviser only
  { label: "Interviews", href: "/dashboard/interviews", icon: Calendar, roles: ["SUPER_ADMIN", "ADVISER"] },

  // Student Assistants - Super Admin, Adviser, Officer, Office Supervisor (NOT HRMO, NOT SA)
  { label: "Student Assistants", href: "/dashboard/student-assistants", icon: Users, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR"] },

  // Schedules - Super Admin, Adviser, Officer, Office Supervisor, SA
  { label: "Schedules", href: "/dashboard/schedules", icon: Clock, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR", "STUDENT_ASSISTANT"] },

  // Attendance - Super Admin, Adviser, Officer, Office Supervisor, SA (NOT HRMO)
  { label: "Attendance", href: "/dashboard/attendance", icon: CheckCircle, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR", "STUDENT_ASSISTANT"] },

  // Evaluations - Super Admin, Adviser, Officer, Office Supervisor (NOT SA)
  { label: "Evaluations", href: "/dashboard/evaluations", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR"] },

  // My Payments - Student Assistant only (view & pay collection fees)
  { label: "My Payments", href: "/dashboard/payments", icon: DollarSign, roles: ["STUDENT_ASSISTANT"] },

  // Collections - Super Admin, Adviser, Officer (manage + view own payments)
  { label: "Collections", href: "/dashboard/payment-collections", icon: Wallet, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER"] },

  // Events - Super Admin, Adviser, Officer, Student Assistant
  { label: "Events", href: "/dashboard/events", icon: CalendarPlus, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "STUDENT_ASSISTANT"] },

  // Offices - Super Admin, Adviser, Officer, Office Supervisor
  { label: "Offices", href: "/dashboard/offices", icon: Building2, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR"] },

  // Certificates - Super Admin, Adviser
  { label: "Certificates", href: "/dashboard/certificates", icon: Award, roles: ["SUPER_ADMIN", "ADVISER"] },

  // Announcements - Super Admin, Adviser, Officer
  { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER"] },

  // Notifications - visible to all authenticated
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, roles: [] },

  // CMS / Content - Super Admin only
  { label: "CMS / Content", href: "/dashboard/content", icon: PenSquare, roles: ["SUPER_ADMIN"] },

  // Renewals Management - Super Admin, Adviser, Officer
  { label: "Renewals", href: "/dashboard/renewals", icon: RefreshCw, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER"] },

  // SA Renewal Form - Student Assistant only
  { label: "My Renewal", href: "/dashboard/renewal", icon: RefreshCw, roles: ["STUDENT_ASSISTANT"] },

  // Settings - Super Admin, Adviser, and Officer (for payment settings)
  { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["SUPER_ADMIN", "ADVISER", "OFFICER"] },
];

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADVISER: "SA Adviser",
  OFFICER: "Organization Officer",
  OFFICE_SUPERVISOR: "Office Supervisor",
  HRMO: "HRMO",
  STUDENT_ASSISTANT: "Student Assistant",
  APPLICANT: "Applicant",
  PUBLIC_VISITOR: "Visitor",
};

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userPhotoUrl = useUserPhoto();
  const userRole = (session?.user as { role?: string })?.role || "";

  const filteredItems = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.includes(userRole)
  );

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-white/10 px-4 py-5",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 p-1">
          <Image
            src="/logo/umak-sas-logo.png"
            alt="UMAK SAS"
            width={40}
            height={40}
            className="h-8 w-auto object-contain"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white tracking-tight">UMak SAS</h2>
            <p className="text-[10px] text-blue-300/70 tracking-wide uppercase">Management Portal</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-blue-200 hover:bg-white/10 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                {/* Active left border accent */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-amber-500" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && session?.user && (
          <div className="mb-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt={session.user.name || "User"}
                  className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-white/10"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white text-xs font-bold">
                  {((session.user as { firstName?: string })?.firstName?.[0] || (session.user.name?.[0] || "U")).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {userRole === "HRMO" ? "HRMO" : session.user.name}
                </p>
                <p className="text-[10px] text-blue-300/60 truncate">
                  {roleLabels[userRole] || userRole}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/portal-login" })}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 text-blue-200 hover:bg-white/10 hover:text-white",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const { collapsed, toggle } = useSidebarStore();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 shadow-2xl transition-all duration-300 lg:flex",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <SidebarNav collapsed={collapsed} />
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-24 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <MobileSidebar />
      </div>
    </>
  );
}

function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-3 top-3 z-50 h-9 w-9 lg:hidden text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 border-r-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
