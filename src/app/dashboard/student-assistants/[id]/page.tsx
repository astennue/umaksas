"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  Calendar,
  Clock,
  UserCheck,
  Star,
  TrendingUp,
  FileText,
  DollarSign,
  CreditCard,
  Award,
  BookOpen,
  MapPin,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CircleDot,
  BarChart3,
  User,
  File,
  Download,
  Pencil,
} from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

// --- Types ---
interface SAData {
  id: string;
  profileId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  studentNumber: string | null;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  academicYear: string | null;
  semester: string | null;
  employeeId: string | null;
  status: string;
  archiveReason: string | null;
  archiveDate: string | null;
  totalHoursWorked: number;
  hoursThisSemester: number;
  officeId: string | null;
  office: {
    id: string;
    name: string;
    code: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    headName: string | null;
    headEmail: string | null;
  } | null;
  isOnDuty: boolean;
  lastClockIn: string | null;
  lastClockOut: string | null;
  dateHired: string | null;
  attendance: {
    totalRecords: number;
    totalHours: number;
    recentRecords: {
      id: string;
      date: string;
      timeIn: string | null;
      timeOut: string | null;
      totalHours: number;
      status: string;
    }[];
  };
  evaluation: {
    id: string;
    totalScore: number;
    rating: string | null;
    punctuality: number;
    workQuality: number;
    initiative: number;
    teamwork: number;
    communication: number;
    attitude: number;
    strengths: string | null;
    improvements: string | null;
    supervisorComments: string | null;
    month: number;
    year: number;
    semester: string | null;
    createdAt: string;
    evaluatorName: string;
    officeName: string;
  } | null;
  application: {
    id: string;
    status: string;
    currentStep: number;
    interviewScore: number | null;
    interviewStatus: string | null;
    totalScore: number | null;
    rank: number | null;
    submittedAt: string | null;
    createdAt: string;
    gwa: string | null;
  } | null;
  payments: {
    records: {
      id: string;
      amount: number;
      month: number;
      year: number;
      status: string;
      referenceNumber: string | null;
      createdAt: string;
    }[];
    totalPaid: number;
    paidCount: number;
  };
  schedules: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    type: string;
    location: string | null;
    semester: string | null;
    academicYear: string | null;
    dayName: string;
  }[];
  documents: {
    id: string;
    type: string;
    title: string;
    fileUrl: string;
    createdAt: string;
  }[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Active",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  RESIGNED: {
    label: "Resigned",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  DISMISSED: {
    label: "Dismissed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  OTHER: {
    label: "Other",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  },
};

const ratingColors: Record<string, string> = {
  EXCELLENT: "text-green-600 dark:text-green-400",
  OUTSTANDING: "text-emerald-600 dark:text-emerald-400",
  VERY_SATISFACTORY: "text-blue-600 dark:text-blue-400",
  SATISFACTORY: "text-amber-600 dark:text-amber-400",
  FAIR: "text-orange-600 dark:text-orange-400",
  POOR: "text-red-600 dark:text-red-400",
};

const attendanceStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  PRESENT: { label: "Present", className: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
  ABSENT: { label: "Absent", className: "text-red-600 dark:text-red-400", icon: XCircle },
  LATE: { label: "Late", className: "text-amber-600 dark:text-amber-400", icon: AlertCircle },
  HALF_DAY: { label: "Half Day", className: "text-orange-600 dark:text-orange-400", icon: AlertCircle },
  ON_LEAVE: { label: "On Leave", className: "text-blue-600 dark:text-blue-400", icon: Calendar },
  HOLIDAY: { label: "Holiday", className: "text-purple-600 dark:text-purple-400", icon: CalendarDays },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  PAID: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  REJECTED: { label: "Rejected", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

const appStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  SUBMITTED: { label: "Submitted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  INTERVIEWED: { label: "Interviewed", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

function InfoRow({ icon: Icon, label, value, iconColor }: { icon: React.ElementType; label: string; value: string | null | undefined; iconColor?: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor || "text-muted-foreground"}`} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">
          {value || <span className="text-muted-foreground italic">Not available</span>}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-[#1e3a8a] dark:text-amber-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function SAProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<SAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    async function fetchProfile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/student-assistants/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) setError("Student assistant not found");
          else if (res.status === 401) router.push("/portal-login");
          else setError("Failed to load profile");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [params.id, router]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{error || "Student assistant not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const fullName = [data.firstName, data.middleName, data.lastName, data.suffix]
    .filter(Boolean)
    .join(" ");
  const initials = `${data.firstName?.charAt(0) || ""}${data.lastName?.charAt(0) || ""}`;
  const statusConf = statusConfig[data.status] || statusConfig.OTHER;

  const userRole = session?.user?.role;
  const canManage = userRole === "SUPER_ADMIN" || userRole === "ADVISER" || userRole === "OFFICER";

  return (
    <div className="space-y-6">
      {/* Back button + Edit */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {canManage && (
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/student-assistants?edit=${params.id}`)}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-6 py-8 relative overflow-hidden">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl translate-y-1/2" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative">
              {data.photoUrl ? (
                <img
                  src={data.photoUrl}
                  alt={fullName}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white/20 shadow-xl"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/20 shadow-xl">
                  {initials}
                </div>
              )}
              {/* On duty indicator */}
              {data.isOnDuty && (
                <span className="absolute bottom-1 right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-white" />
                </span>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{fullName}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs">
                  <User className="mr-1 h-3 w-3" />
                  Student Assistant
                </Badge>
                <Badge className={`${statusConf.className} border text-xs`}>
                  {data.isOnDuty && (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                  {statusConf.label}
                </Badge>
                {data.isOnDuty && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                    On Duty
                  </Badge>
                )}
              </div>

              {data.college && (
                <p className="text-blue-200 text-sm mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {data.college}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-800 border shadow-sm h-auto p-1 flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs sm:text-sm">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="text-xs sm:text-sm">
            Evaluations
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">
            Payments
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm">
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <SectionCard title="Basic Information" icon={User}>
              <div className="divide-y divide-border">
                <InfoRow icon={Mail} label="Email" value={data.email} />
                <InfoRow icon={Phone} label="Phone" value={data.phone} />
                <InfoRow icon={UserCheck} label="Student Number" value={data.studentNumber} />
                <InfoRow icon={GraduationCap} label="College" value={data.college} iconColor="text-blue-600 dark:text-blue-400" />
                <InfoRow icon={BookOpen} label="Program" value={data.program} iconColor="text-indigo-600 dark:text-indigo-400" />
                <InfoRow icon={Star} label="Year Level" value={data.yearLevel ? `Year ${data.yearLevel}` : null} iconColor="text-amber-600 dark:text-amber-400" />
              </div>
            </SectionCard>

            {/* Office Assignment */}
            <SectionCard title="Office Assignment" icon={Building2}>
              <div className="divide-y divide-border">
                <InfoRow icon={Building2} label="Office" value={data.office?.name} iconColor="text-amber-600 dark:text-amber-400" />
                <InfoRow icon={Mail} label="Office Email" value={data.office?.email} />
                <InfoRow icon={Phone} label="Office Phone" value={data.office?.phone} />
                <InfoRow icon={MapPin} label="Office Location" value={data.office?.location} />
                <InfoRow icon={UserCheck} label="Supervisor" value={data.office?.headName} />
                <InfoRow icon={Mail} label="Supervisor Email" value={data.office?.headEmail} />
                <InfoRow icon={Briefcase} label="Employee ID" value={data.employeeId} />
                <InfoRow
                  icon={Calendar}
                  label="Date Hired"
                  value={data.dateHired ? format(new Date(data.dateHired), "MMMM d, yyyy") : null}
                />
                <InfoRow icon={FileText} label="Office Code" value={data.office?.code} />
              </div>
            </SectionCard>

            {/* Academic Info */}
            <SectionCard title="Academic Information" icon={BookOpen}>
              <div className="divide-y divide-border">
                <InfoRow icon={Star} label="GWA" value={data.application?.gwa ? `${data.application.gwa} / 5.00` : null} iconColor="text-amber-600 dark:text-amber-400" />
                <InfoRow icon={GraduationCap} label="Year Level" value={data.yearLevel ? `Year ${data.yearLevel}` : null} />
                <InfoRow icon={CalendarDays} label="Academic Year" value={data.academicYear} />
                <InfoRow icon={BookOpen} label="Semester" value={data.semester} />
              </div>
              {/* Hours summary */}
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{data.totalHoursWorked.toFixed(1)}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">Total Hours</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{data.hoursThisSemester.toFixed(1)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Hours This Sem</p>
                </div>
              </div>
            </SectionCard>

            {/* Schedule / Availability */}
            <SectionCard title="Schedule / Availability" icon={Clock}>
              {data.schedules.length > 0 ? (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {data.schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 dark:bg-amber-500/10 text-xs font-bold text-[#1e3a8a] dark:text-amber-400">
                          {schedule.dayName.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{schedule.dayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {schedule.type.toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No schedules found"
                  description="No approved schedules have been assigned yet."
                  className="min-h-0 py-8"
                />
              )}
            </SectionCard>

            {/* Application History */}
            <SectionCard title="Application History" icon={FileText} className="md:col-span-2">
              {data.application ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Application Status</p>
                    <Badge className={`${appStatusConfig[data.application.status]?.className || ""} mt-1 border text-xs`}>
                      {appStatusConfig[data.application.status]?.label || data.application.status}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Interview Score</p>
                    <p className="text-sm font-medium mt-1">
                      {data.application.interviewScore != null ? `${data.application.interviewScore}/100` : <span className="text-muted-foreground italic">N/A</span>}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Application Date</p>
                    <p className="text-sm font-medium mt-1">
                      {data.application.submittedAt
                        ? format(new Date(data.application.submittedAt), "MMM d, yyyy")
                        : format(new Date(data.application.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Overall Score</p>
                    <p className="text-sm font-medium mt-1">
                      {data.application.totalScore != null ? `${data.application.totalScore.toFixed(1)}%` : <span className="text-muted-foreground italic">N/A</span>}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No application record found.</p>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Summary cards */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{data.attendance.totalRecords}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">Total Records</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{data.attendance.totalHours.toFixed(1)}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Total Hours</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{data.hoursThisSemester.toFixed(1)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Hours This Semester</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance Records */}
          <SectionCard title="Recent Attendance Records" icon={Calendar}>
            {data.attendance.recentRecords.length > 0 ? (
              <ScrollArea className="max-h-96">
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-3 py-2">
                    <div className="col-span-3">Date</div>
                    <div className="col-span-3">Time In</div>
                    <div className="col-span-3">Time Out</div>
                    <div className="col-span-1 text-center">Hours</div>
                    <div className="col-span-2 text-right">Status</div>
                  </div>
                  {data.attendance.recentRecords.map((record) => {
                    const attStatus = attendanceStatusConfig[record.status] || attendanceStatusConfig.PRESENT;
                    const StatusIcon = attStatus.icon;
                    return (
                      <div
                        key={record.id}
                        className="grid grid-cols-12 gap-2 items-center text-sm px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="col-span-3 font-medium">
                          {format(new Date(record.date), "MMM d, yyyy")}
                        </div>
                        <div className="col-span-3 text-muted-foreground">
                          {record.timeIn ? format(new Date(record.timeIn), "h:mm a") : "-"}
                        </div>
                        <div className="col-span-3 text-muted-foreground">
                          {record.timeOut ? format(new Date(record.timeOut), "h:mm a") : "-"}
                        </div>
                        <div className="col-span-1 text-center font-medium">
                          {record.totalHours > 0 ? record.totalHours.toFixed(1) : "-"}
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <StatusIcon className={`h-3.5 w-3.5 ${attStatus.className}`} />
                          <span className={`text-xs font-medium ${attStatus.className}`}>
                            {attStatus.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <EmptyState
                icon={Clock}
                title="No attendance records"
                description="Attendance records will appear here once the SA starts clocking in."
                className="min-h-0 py-8"
              />
            )}
          </SectionCard>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="space-y-4">
          {data.evaluation ? (
            <>
              {/* Score Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-4xl font-bold text-blue-700 dark:text-blue-400">{data.evaluation.totalScore.toFixed(1)}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Overall Score</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-0">
                  <CardContent className="p-4 text-center">
                    <p className={`text-xl font-bold ${ratingColors[data.evaluation.rating || ""] || "text-gray-600"}`}>
                      {data.evaluation.rating?.replace(/_/g, " ") || "N/A"}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Rating</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-400">{data.evaluation.evaluatorName}</p>
                    <p className="text-xs text-violet-600 dark:text-violet-500 mt-1">
                      {format(new Date(data.evaluation.createdAt), "MMMM yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">{data.evaluation.officeName}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Category Scores */}
              <SectionCard title="Evaluation Categories" icon={BarChart3}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Punctuality", value: data.evaluation.punctuality },
                    { label: "Work Quality", value: data.evaluation.workQuality },
                    { label: "Initiative", value: data.evaluation.initiative },
                    { label: "Teamwork", value: data.evaluation.teamwork },
                    { label: "Communication", value: data.evaluation.communication },
                    { label: "Attitude", value: data.evaluation.attitude },
                  ].map((cat) => (
                    <div key={cat.label} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">{cat.label}</p>
                        <p className="text-sm font-bold">{cat.value.toFixed(1)}</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-amber-500 transition-all duration-500"
                          style={{ width: `${Math.min(cat.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Comments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard title="Strengths" icon={Star}>
                  <p className="text-sm text-muted-foreground">
                    {data.evaluation.strengths || <span className="italic">No strengths listed</span>}
                  </p>
                </SectionCard>
                <SectionCard title="Areas for Improvement" icon={TrendingUp}>
                  <p className="text-sm text-muted-foreground">
                    {data.evaluation.improvements || <span className="italic">No improvements listed</span>}
                  </p>
                </SectionCard>
              </div>

              {data.evaluation.supervisorComments && (
                <SectionCard title="Supervisor Comments" icon={UserCheck}>
                  <p className="text-sm text-muted-foreground">{data.evaluation.supervisorComments}</p>
                </SectionCard>
              )}
            </>
          ) : (
            <EmptyState
              icon={Star}
              title="No evaluations yet"
              description="Evaluation records will appear here once submitted by a supervisor."
            />
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">₱{data.payments.totalPaid.toFixed(2)}</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Total Paid</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{data.payments.paidCount}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">Months Paid</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/20 dark:to-slate-800/10 border-0">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-600 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-400">{data.payments.records.length}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-500">Total Records</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <SectionCard title="Payment History" icon={DollarSign}>
            {data.payments.records.length > 0 ? (
              <ScrollArea className="max-h-96">
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-3 py-2">
                    <div className="col-span-3">Period</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-3">Reference</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2 text-right">Status</div>
                  </div>
                  {data.payments.records.map((payment) => {
                    const monthName = format(new Date(payment.year, payment.month - 1), "MMM yyyy");
                    const payStatus = paymentStatusConfig[payment.status] || paymentStatusConfig.UNPAID;
                    return (
                      <div
                        key={payment.id}
                        className="grid grid-cols-12 gap-2 items-center text-sm px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="col-span-3 font-medium">{monthName}</div>
                        <div className="col-span-2 text-muted-foreground">₱{payment.amount.toFixed(2)}</div>
                        <div className="col-span-3 text-xs text-muted-foreground truncate">
                          {payment.referenceNumber || <span className="italic">N/A</span>}
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          {format(new Date(payment.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="col-span-2 text-right">
                          <Badge variant="secondary" className={`text-xs ${payStatus.className}`}>
                            {payStatus.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No payment records"
                description="Payment records will appear here once generated."
                className="min-h-0 py-8"
              />
            )}
          </SectionCard>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <SectionCard title="Uploaded Documents" icon={File}>
            {data.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <File className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type.replace(/_/g, " ")} &bull; {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No documents uploaded"
                description="Uploaded documents will appear here once available."
                className="min-h-0 py-8"
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
