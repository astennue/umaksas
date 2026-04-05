"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Building2,
  GraduationCap,
  Calendar,
  Clock,
  Mail,
  Phone,
  BookOpen,
  Star,
  TrendingUp,
  DollarSign,
  CreditCard,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { getCollegeDisplay } from "@/lib/colleges";

interface SADetailData {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  studentNumber: string | null;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  employeeId: string | null;
  status: string;
  totalHoursWorked: number;
  hoursThisSemester: number;
  office: {
    id: string;
    name: string;
    code: string | null;
    email: string | null;
    location: string | null;
    headName: string | null;
  } | null;
  isOnDuty: boolean;
  dateHired: string | null;
  isOfficer?: boolean;
  officerPosition?: string | null;
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
    evaluatorName: string;
    officeName: string;
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
    dayName: string;
  }[];
}

interface SAFullProfileModalProps {
  saId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  RESIGNED: { label: "Resigned", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const attendanceStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  PRESENT: { label: "Present", className: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
  ABSENT: { label: "Absent", className: "text-red-600 dark:text-red-400", icon: XCircle },
  LATE: { label: "Late", className: "text-amber-600 dark:text-amber-400", icon: AlertCircle },
  HALF_DAY: { label: "Half Day", className: "text-orange-600 dark:text-orange-400", icon: AlertCircle },
  ON_LEAVE: { label: "On Leave", className: "text-blue-600 dark:text-blue-400", icon: Calendar },
  HOLIDAY: { label: "Holiday", className: "text-purple-600 dark:text-purple-400", icon: Calendar },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  PAID: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export function SAFullProfileModal({ saId, open, onOpenChange }: SAFullProfileModalProps) {
  const [data, setData] = useState<SADetailData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!saId || !open) {
      if (!open) setData(null);
      return;
    }

    let cancelled = false;
    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(`/api/student-assistants/${saId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error("Error fetching SA profile:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [saId, open]);

  const fullName = data
    ? [data.firstName, data.middleName?.charAt(0) ? `${data.middleName.charAt(0)}.` : null, data.lastName, data.suffix].filter(Boolean).join(" ")
    : "";
  const initials = data
    ? `${data.firstName?.charAt(0) || ""}${data.lastName?.charAt(0) || ""}`.toUpperCase()
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{fullName} - Full Profile</DialogTitle>
          <DialogDescription>Comprehensive profile information</DialogDescription>
        </DialogHeader>

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a] mb-3" />
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        )}

        {!loading && data && (
          <ScrollArea className="max-h-[85vh]">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#0f1b4d] to-[#0d2247] px-6 pt-8 pb-8">
              <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-yellow-500/10 blur-2xl" />
              <div className="absolute bottom-2 left-6 w-20 h-20 rounded-full bg-blue-500/10 blur-2xl" />

              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
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
                  {data.isOnDuty && (
                    <span className="absolute bottom-1 right-1 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-white" />
                    </span>
                  )}
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white break-words">{fullName}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                    {data.isOfficer && data.officerPosition && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                        {data.officerPosition.replace(/_/g, " ")}
                      </Badge>
                    )}
                    <Badge className={statusConfig[data.status]?.className || ""}>
                      {data.isOnDuty && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                      {statusConfig[data.status]?.label || data.status}
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
                      {getCollegeDisplay(data.college, 'both')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="mt-1">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 px-6">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a8a] data-[state=active]:bg-transparent text-xs sm:text-sm px-3 py-2.5">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a8a] data-[state=active]:bg-transparent text-xs sm:text-sm px-3 py-2.5">
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="evaluation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a8a] data-[state=active]:bg-transparent text-xs sm:text-sm px-3 py-2.5">
                  Evaluation
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a8a] data-[state=active]:bg-transparent text-xs sm:text-sm px-3 py-2.5">
                  Payments
                </TabsTrigger>
              </TabsList>

              <div className="px-6 pb-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-5 space-y-4">
                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{data.totalHoursWorked.toFixed(1)}</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-500">Total Hours</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{data.hoursThisSemester.toFixed(1)}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500">This Sem</p>
                    </div>
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                      <p className="text-xl font-bold text-green-700 dark:text-green-400">{data.attendance.totalRecords}</p>
                      <p className="text-[10px] text-green-600 dark:text-green-500">Attendance</p>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-2">
                    <InfoRow icon={Mail} label="Email" value={data.email} />
                    <InfoRow icon={Phone} label="Phone" value={data.phone} />
                    <InfoRow icon={User} label="Student Number" value={data.studentNumber} />
                    <InfoRow icon={GraduationCap} label="College" value={data.college} />
                    <InfoRow icon={BookOpen} label="Program" value={data.program ? `${data.program}${data.yearLevel ? ` • Year ${data.yearLevel}` : ""}` : null} />
                    <InfoRow icon={Building2} label="Office" value={data.office?.name} />
                    <InfoRow icon={Building2} label="Office Code" value={data.office?.code} />
                    <InfoRow icon={Building2} label="Office Location" value={data.office?.location} />
                    <InfoRow icon={Calendar} label="Date Hired" value={data.dateHired ? format(new Date(data.dateHired), "MMM d, yyyy") : null} />
                  </div>

                  {/* Schedule */}
                  {data.schedules.length > 0 && (
                    <>
                      <Separator />
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Schedule</h4>
                      <div className="space-y-1.5">
                        {data.schedules.map((schedule) => (
                          <div key={schedule.id} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-xs font-bold text-[#1e3a8a]">
                              {schedule.dayName.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{schedule.dayName}</p>
                              <p className="text-xs text-muted-foreground">{schedule.startTime} - {schedule.endTime}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs capitalize">{schedule.type.toLowerCase()}</Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="mt-5">
                  {data.attendance.totalRecords === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No attendance records yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{data.attendance.totalHours.toFixed(1)}</p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-500">Total Hours</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{data.attendance.recentRecords.length}</p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-500">Recent Records</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {data.attendance.recentRecords.map((record) => {
                          const attStatus = attendanceStatusConfig[record.status] || attendanceStatusConfig.PRESENT;
                          const StatusIcon = attStatus.icon;
                          return (
                            <div key={record.id} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm">
                              <span className="text-xs text-muted-foreground w-20 shrink-0">
                                {format(new Date(record.date), "MMM d")}
                              </span>
                              <span className="text-xs text-muted-foreground flex-1 truncate">
                                {record.timeIn ? format(new Date(record.timeIn), "h:mm a") : "-"} - {record.timeOut ? format(new Date(record.timeOut), "h:mm a") : "-"}
                              </span>
                              <span className="text-xs font-medium w-12 text-right">{record.totalHours > 0 ? `${record.totalHours.toFixed(1)}h` : "-"}</span>
                              <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${attStatus.className}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Evaluation Tab */}
                <TabsContent value="evaluation" className="mt-5">
                  {!data.evaluation ? (
                    <div className="text-center py-8">
                      <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No evaluation records yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{data.evaluation.totalScore.toFixed(1)}</p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-500">Score</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{data.evaluation.rating?.replace(/_/g, " ") || "N/A"}</p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-500">Rating</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-center">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{data.evaluation.evaluatorName}</p>
                          <p className="text-[10px] text-slate-500">{data.evaluation.officeName}</p>
                        </div>
                      </div>

                      {/* Category scores */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Punctuality", value: data.evaluation.punctuality },
                          { label: "Work Quality", value: data.evaluation.workQuality },
                          { label: "Initiative", value: data.evaluation.initiative },
                          { label: "Teamwork", value: data.evaluation.teamwork },
                          { label: "Communication", value: data.evaluation.communication },
                          { label: "Attitude", value: data.evaluation.attitude },
                        ].map((cat) => (
                          <div key={cat.label} className="rounded-lg border p-2.5">
                            <p className="text-[10px] text-muted-foreground">{cat.label}</p>
                            <p className="text-sm font-bold mt-0.5">{cat.value.toFixed(1)}</p>
                            <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-1">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-amber-500" style={{ width: `${Math.min(cat.value, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comments */}
                      <div className="space-y-3">
                        {data.evaluation.strengths && (
                          <div className="rounded-lg bg-green-50 dark:bg-green-900/10 p-3">
                            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Strengths</p>
                            <p className="text-xs text-green-800 dark:text-green-300">{data.evaluation.strengths}</p>
                          </div>
                        )}
                        {data.evaluation.improvements && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-3">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Areas for Improvement</p>
                            <p className="text-xs text-amber-800 dark:text-amber-300">{data.evaluation.improvements}</p>
                          </div>
                        )}
                        {data.evaluation.supervisorComments && (
                          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 p-3">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Supervisor Comments</p>
                            <p className="text-xs text-blue-800 dark:text-blue-300">{data.evaluation.supervisorComments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-5">
                  {data.payments.records.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No payment records.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                          <p className="text-xl font-bold text-green-700 dark:text-green-400">₱{data.payments.totalPaid.toFixed(2)}</p>
                          <p className="text-[10px] text-green-600 dark:text-green-500">Total Paid</p>
                        </div>
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{data.payments.paidCount}</p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-500">Months Paid</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {data.payments.records.map((payment) => {
                          const monthName = format(new Date(payment.year, payment.month - 1), "MMM yyyy");
                          const payStatus = paymentStatusConfig[payment.status] || paymentStatusConfig.UNPAID;
                          return (
                            <div key={payment.id} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm">
                              <span className="text-xs font-medium w-20">{monthName}</span>
                              <span className="text-xs text-muted-foreground flex-1">₱{payment.amount.toFixed(2)}</span>
                              <Badge variant="secondary" className={`text-[10px] ${payStatus.className}`}>
                                {payStatus.label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-xs text-muted-foreground w-24 shrink-0">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">
        {value || <span className="text-muted-foreground italic">N/A</span>}
      </p>
    </div>
  );
}
