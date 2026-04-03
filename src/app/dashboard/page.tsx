"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Building2,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Bell,
  Clock,
  Star,
  RefreshCw,
  DollarSign,
  Settings,
  CreditCard,
  ToggleLeft,
  Megaphone,
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalSAs: number;
  activeSAs: number;
  onDutySAs: number;
  totalApplications: number;
  pendingApplications: number;
  scheduledInterviews: number;
  completedInterviews: number;
  totalOffices: number;
}

interface RecentInterview {
  id: string;
  scheduledAt: string;
  status: string;
  applicantName: string;
  applicantEmail: string;
}

interface RecentApplication {
  id: string;
  firstName: string | null;
  lastName: string | null;
  applicantEmail: string;
  status: string;
  createdAt: string;
  college?: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADVISER: "SA Adviser",
  OFFICER: "Organization Officer",
  OFFICE_SUPERVISOR: "Office Supervisor",
  STUDENT_ASSISTANT: "Student Assistant",
  APPLICANT: "Applicant",
  PUBLIC_VISITOR: "Visitor",
};

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_REVIEW: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  INTERVIEW_SCHEDULED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  INTERVIEWED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

function QuickActionCard({
  href,
  icon: Icon,
  title,
  subtitle,
  colorClass,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  colorClass?: string;
}) {
  return (
    <Card className="border-0 shadow-md rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer">
      <Link href={href} className="flex flex-col items-center gap-3 text-center">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
          colorClass || "bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-900/30"
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </Link>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as { role?: string; firstName?: string; lastName?: string } | undefined;
  const [stats, setStats] = useState<DashboardStats>({
    totalSAs: 0,
    activeSAs: 0,
    onDutySAs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    scheduledInterviews: 0,
    completedInterviews: 0,
    totalOffices: 0,
  });
  const [recentInterviews, setRecentInterviews] = useState<RecentInterview[]>([]);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch SAs
        const saRes = await fetch("/api/student-assistants?limit=1000");
        if (saRes.ok) {
          const saData = await saRes.json();
          const sas = saData.studentAssistants || [];
          const activeOffices = new Set(sas.map((sa: { officeName: string | null }) => sa.officeName).filter(Boolean));

          setStats((prev) => ({
            ...prev,
            totalSAs: saData.total || sas.length,
            activeSAs: sas.filter((sa: { status: string }) => sa.status === "ACTIVE").length,
            onDutySAs: sas.filter((sa: { isOnDuty: boolean }) => sa.isOnDuty).length,
            totalOffices: activeOffices.size,
          }));
        }

        // Fetch Applications
        const appRes = await fetch("/api/applications/admin?limit=1000");
        if (appRes.ok) {
          const appData = await appRes.json();
          const apps = appData.applications || [];
          setStats((prev) => ({
            ...prev,
            totalApplications: appData.total || apps.length,
            pendingApplications: apps.filter((a: { status: string }) =>
              ["SUBMITTED", "UNDER_REVIEW"].includes(a.status)
            ).length,
          }));
          setRecentApplications(apps.slice(0, 5));
        }

        // Fetch Interviews
        const intRes = await fetch("/api/interviews?limit=1000");
        if (intRes.ok) {
          const intData = await intRes.json();
          const interviews = intData.interviews || [];
          setStats((prev) => ({
            ...prev,
            scheduledInterviews: interviews.filter((i: { status: string }) =>
              ["SCHEDULED", "ACCEPTED"].includes(i.status)
            ).length,
            completedInterviews: interviews.filter((i: { status: string }) =>
              i.status === "COMPLETED"
            ).length,
          }));
          const recent = interviews.slice(0, 5).map((i: {
            id: string;
            scheduledAt: string;
            status: string;
            application: { firstName: string | null; lastName: string | null; applicantEmail: string };
          }) => ({
            id: i.id,
            scheduledAt: i.scheduledAt,
            status: i.status,
            applicantName: `${i.application.firstName || ""} ${i.application.lastName || ""}`.trim() || i.application.applicantEmail,
            applicantEmail: i.application.applicantEmail,
          }));
          setRecentInterviews(recent);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const greeting = user?.firstName ? user.firstName : "User";
  const userRole = user?.role || "";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 w-full animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-72 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  // Role-based quick actions
  const renderQuickActions = () => {
    // SA Dashboard
    if (userRole === "STUDENT_ASSISTANT") {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/dashboard/renewal"
            icon={RefreshCw}
            title="Renewal"
            subtitle="Submit renewal application"
            colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-900/30"
          />
          <QuickActionCard
            href="/dashboard/payments"
            icon={CreditCard}
            title="Payment for Org Fee"
            subtitle="Pay monthly organization fee"
            colorClass="bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:group-hover:bg-amber-900/30"
          />
          <QuickActionCard
            href="/dashboard/schedules"
            icon={Clock}
            title="My Schedule"
            subtitle="View work schedule"
            colorClass="bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:group-hover:bg-cyan-900/30"
          />
          <QuickActionCard
            href="/dashboard/attendance"
            icon={CheckCircle}
            title="Attendance"
            subtitle="View attendance records"
            colorClass="bg-violet-50 text-violet-600 group-hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:group-hover:bg-violet-900/30"
          />
          <QuickActionCard
            href="/dashboard/notifications"
            icon={Bell}
            title="Notifications"
            subtitle="Stay updated"
            colorClass="bg-rose-50 text-rose-600 group-hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:group-hover:bg-rose-900/30"
          />
        </div>
      );
    }

    // Adviser + SuperAdmin Dashboard
    if (userRole === "SUPER_ADMIN" || userRole === "ADVISER") {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            href="/dashboard/applications"
            icon={FileText}
            title="Manage Applications"
            subtitle={`${stats.pendingApplications} pending`}
            colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-900/30"
          />
          <QuickActionCard
            href="/dashboard/interviews"
            icon={Calendar}
            title="Manage Interviews"
            subtitle={`${stats.scheduledInterviews} scheduled`}
            colorClass="bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:group-hover:bg-cyan-900/30"
          />
          <QuickActionCard
            href="/dashboard/settings"
            icon={Settings}
            title="Open Application Period"
            subtitle="Toggle application status"
            colorClass="bg-green-50 text-green-600 group-hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:group-hover:bg-green-900/30"
          />
          <QuickActionCard
            href="/dashboard/settings"
            icon={RefreshCw}
            title="Open Renewal Period"
            subtitle="Toggle renewal status"
            colorClass="bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:group-hover:bg-amber-900/30"
          />
        </div>
      );
    }

    // Officer Dashboard (Treasurer + President + other officers)
    if (userRole === "OFFICER") {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <QuickActionCard
            href="/dashboard/settings"
            icon={DollarSign}
            title="Set Up QR Code / Payment"
            subtitle="Configure GCash details"
            colorClass="bg-green-50 text-green-600 group-hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:group-hover:bg-green-900/30"
          />
          <QuickActionCard
            href="/dashboard/settings"
            icon={ToggleLeft}
            title="Toggle Payment Collection"
            subtitle="Open/Close payment period"
            colorClass="bg-rose-50 text-rose-600 group-hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:group-hover:bg-rose-900/30"
          />
          <QuickActionCard
            href="/dashboard/payments"
            icon={CreditCard}
            title="View Payments"
            subtitle="Track payment status"
            colorClass="bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:group-hover:bg-amber-900/30"
          />
          <QuickActionCard
            href="/dashboard/announcements"
            icon={Megaphone}
            title="Announcements"
            subtitle="Manage announcements"
            colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-900/30"
          />
          <QuickActionCard
            href="/dashboard/events"
            icon={Calendar}
            title="Events"
            subtitle="Manage org events"
            colorClass="bg-violet-50 text-violet-600 group-hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:group-hover:bg-violet-900/30"
          />
        </div>
      );
    }

    // Office Supervisor Dashboard
    if (userRole === "OFFICE_SUPERVISOR") {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            href="/dashboard/evaluations"
            icon={CheckCircle}
            title="Evaluations"
            subtitle="Rate your Student Assistants"
            colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-900/30"
          />
          <QuickActionCard
            href="/dashboard/schedules"
            icon={Clock}
            title="Schedules"
            subtitle="View & approve schedules"
            colorClass="bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:group-hover:bg-cyan-900/30"
          />
          <QuickActionCard
            href="/dashboard/attendance"
            icon={UserCheck}
            title="Attendance"
            subtitle="View office attendance"
            colorClass="bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:group-hover:bg-amber-900/30"
          />
          <QuickActionCard
            href="/dashboard/notifications"
            icon={Bell}
            title="Notifications"
            subtitle="Stay updated"
            colorClass="bg-green-50 text-green-600 group-hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:group-hover:bg-green-900/30"
          />
        </div>
      );
    }

    // Default (HRMO, etc.)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href="/dashboard/notifications"
          icon={Bell}
          title="Notifications"
          subtitle="Stay updated"
          colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:group-hover:bg-blue-900/30"
        />
      </div>
    );
  };

  // Hide stats for SA role
  const showStats = userRole !== "STUDENT_ASSISTANT";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 p-6 sm:p-8 text-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-950">
        <div className="animate-blob absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="animate-blob-delay absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-blue-400/15 blur-2xl" />
        <div className="absolute right-1/3 top-4 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
        <motion.div
          className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/20 dark:bg-blue-500/10 blur-3xl"
          animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-500/20 dark:bg-amber-500/10 blur-3xl"
          animate={{ x: [0, -25, 15, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/90 p-1 shadow-lg shadow-amber-500/25">
              <Image
                src="/logo/umak-sas-logo.png"
                alt="UMAK SAS"
                width={48}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {greeting}!
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-500/90 text-white border-0 text-xs font-medium hover:bg-amber-500/80">
                  {roleLabels[userRole] || userRole}
                </Badge>
                <span className="text-sm text-blue-200 dark:text-gray-400">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <p className="mt-2 text-sm text-blue-100/80 dark:text-gray-400 max-w-xl">
                {userRole === "STUDENT_ASSISTANT"
                  ? "Here's your Student Assistant portal. View your schedule, attendance, and manage your renewal."
                  : "Here's an overview of the Student Assistant Management System. Stay on top of applications, interviews, and team activities."}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-amber-300 dark:text-amber-400">
            <Star className="h-4 w-4 fill-amber-300 dark:fill-amber-400" />
            <span className="text-sm font-medium">A.Y. 2025-2026</span>
          </div>
        </div>
      </div>

      {/* Stats Cards (hidden for SA role) */}
      {showStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-700 to-amber-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Assistants</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{stats.activeSAs}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stats.totalSAs} total enrolled</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <UserCheck className="h-3 w-3" />
                <span className="font-medium">{stats.onDutySAs} on duty now</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-700 to-amber-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Applications</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalApplications}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stats.pendingApplications} pending review</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              {stats.pendingApplications > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  <span className="font-medium">{stats.pendingApplications} needs review</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-700 to-amber-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Interviews</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{stats.scheduledInterviews}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stats.completedInterviews} completed</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              {stats.scheduledInterviews > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{stats.scheduledInterviews} upcoming</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-700 to-amber-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Offices</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalOffices}</p>
                  <p className="mt-1 text-xs text-muted-foreground">active offices</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>All offices active</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions - Role Based */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
        {renderQuickActions()}
      </div>

      {/* Recent Lists (hidden for SA role) */}
      {showStats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-0 shadow-lg rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Recent Applications</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" asChild>
                  <Link href="/dashboard/applications">
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentApplications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileText className="mb-2 h-10 w-10 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground">No applications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto] gap-2 px-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Applicant</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</span>
                  </div>
                  {recentApplications.map((app) => {
                    const name = `${app.firstName || ""} ${app.lastName || ""}`.trim() || app.applicantEmail;
                    return (
                      <div
                        key={app.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-1 sm:gap-2 items-center rounded-lg px-2 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate sm:hidden">{format(new Date(app.createdAt), "MMM d, yyyy")}</p>
                        </div>
                        <div>
                          <Badge className={cn("text-[10px] font-medium", statusColors[app.status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")} variant="secondary">
                            {app.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="hidden sm:block">
                          <span className="text-xs text-muted-foreground">{format(new Date(app.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Recent Interviews</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" asChild>
                  <Link href="/dashboard/interviews">
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentInterviews.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Calendar className="mb-2 h-10 w-10 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground">No interviews scheduled</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto] gap-2 px-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Applicant</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</span>
                  </div>
                  {recentInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-1 sm:gap-2 items-center rounded-lg px-2 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{interview.applicantName}</p>
                        <p className="text-xs text-muted-foreground truncate sm:hidden">{format(new Date(interview.scheduledAt), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                      <div>
                        <Badge className={cn("text-[10px] font-medium", statusColors[interview.status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")} variant="secondary">
                          {interview.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-xs text-muted-foreground">{format(new Date(interview.scheduledAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Info Footer */}
      <div className="flex items-center gap-3 px-1">
        <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          Academic Year 2025-2026 &bull; 2nd Semester &bull; {stats.activeSAs} Active Student Assistants across {stats.totalOffices} offices
        </p>
      </div>
    </div>
  );
}
