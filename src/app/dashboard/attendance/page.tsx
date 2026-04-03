"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectItem } from "@/components/ui/select";
import { BetterSelect } from "@/components/ui/better-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Calendar,
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  Timer,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileEdit,
  ClipboardList,
  Activity,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { toast } from "sonner";

// ============== TYPES ==============
interface AttendanceRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  college: string | null;
  program: string | null;
  officeName: string | null;
  officeCode: string | null;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalHours: number;
  status: string;
  isCorrected: boolean;
  notes: string | null;
  location: string | null;
}

interface CorrectionRequest {
  id: string;
  attendanceId: string;
  date: string;
  currentTimeIn: string | null;
  currentTimeOut: string | null;
  currentTotalHours: number;
  currentStatus: string;
  requestedBy: string;
  requesterName: string;
  requesterEmail: string;
  officeName: string | null;
  requestedTimeIn: string | null;
  requestedTimeOut: string | null;
  requestedBreakStart: string | null;
  requestedBreakEnd: string | null;
  reason: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

// ============== STATUS CONFIG ==============
const attendanceStatusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  PRESENT: { label: "Present", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", dotColor: "bg-green-500" },
  ABSENT: { label: "Absent", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dotColor: "bg-red-500" },
  LATE: { label: "Late", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dotColor: "bg-amber-500" },
  HALF_DAY: { label: "Half Day", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dotColor: "bg-blue-500" },
  ON_LEAVE: { label: "On Leave", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", dotColor: "bg-slate-400" },
  HOLIDAY: { label: "Holiday", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", dotColor: "bg-purple-500" },
  UNDERTIME: { label: "Undertime", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dotColor: "bg-orange-500" },
  OVERTIME: { label: "Overtime", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dotColor: "bg-blue-500" },
};

const correctionStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

type DutyStatus = "off_duty" | "on_duty" | "on_break";

// ============== MAIN COMPONENT ==============
export default function AttendancePage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  const isSA = userRole === "STUDENT_ASSISTANT";
  // Officer+SA combined: officers who also have an SAProfile can clock in/out
  const isOfficerWithSA = userRole === "OFFICER"; // Server-side checks SAProfile existence
  const canClockIn = isSA || isOfficerWithSA;
  const canClockUser = isSA || isOfficerWithSA; // For stats: treat officer same as SA for own records

  // Data state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>("off_duty");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [officeName, setOfficeName] = useState<string>("");

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarRecords, setCalendarRecords] = useState<AttendanceRecord[]>([]);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // System settings
  const [systemSettings, setSystemSettings] = useState({ lateGraceMinutes: 15, maxWorkHoursPerDay: 4 });
  const [todaySchedule, setTodaySchedule] = useState<{ startTime: string; endTime: string } | null>(null);

  // Stats
  const [stats, setStats] = useState({ presentToday: 0, onDutyNow: 0, absentToday: 0, totalHoursMonth: 0 });

  // Correction modals
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({ timeIn: "", timeOut: "", reason: "" });
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewCorrection, setReviewCorrection] = useState<CorrectionRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("records");

  // ============== FETCH SYSTEM SETTINGS & SCHEDULE ==============
  const fetchSystemSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance?limit=1");
      if (res.ok) {
        const data = await res.json();
        if (data.systemSettings) {
          setSystemSettings({
            lateGraceMinutes: data.systemSettings.lateGraceMinutes || 15,
            maxWorkHoursPerDay: data.systemSettings.maxWorkHoursPerDay || 4,
          });
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchTodaySchedule = useCallback(async () => {
    if (!canClockUser || !userId) return;
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const res = await fetch(`/api/schedules?userId=${userId}&type=WORK&status=APPROVED&dayOfWeek=${dayOfWeek}`);
      if (res.ok) {
        const data = await res.json();
        if (data.schedules && data.schedules.length > 0) {
          setTodaySchedule({
            startTime: data.schedules[0].startTime,
            endTime: data.schedules[0].endTime,
          });
        }
      }
    } catch {
      // Ignore - schedule endpoint may not exist yet, we'll use notes from record
    }
  }, [canClockUser, userId]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ============== REAL-TIME CLOCK ==============
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ============== POLLING FOR STATUS ==============
  useEffect(() => {
    if (!canClockUser) return;
    // Poll fetchStats every 15 seconds to keep duty status reactive
    pollingRef.current = setInterval(() => {
      fetchStats();
    }, 15000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [canClockUser, fetchStats]);

  // ============== FETCH DATA ==============
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search && !canClockUser) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (officeFilter !== "all") params.set("office", officeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, officeFilter, startDate, endDate, canClockUser]);

  const fetchCalendarRecords = useCallback(async (month: Date) => {
    if (!canClockUser && !userId) return;
    try {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const params = new URLSearchParams({
        startDate: format(mStart, "yyyy-MM-dd"),
        endDate: format(mEnd, "yyyy-MM-dd"),
        limit: "100",
      });
      // For SA/Officer, the API already filters by userId (server-side)
      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarRecords(data.records || []);
      }
    } catch {
      // Ignore
    }
  }, [canClockUser, userId]);

  const fetchCorrections = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (canClockUser) {
        // SA/Officer sees their own, handled server-side
      }
      const res = await fetch(`/api/attendance/corrections?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
      }
    } catch {
      // Ignore
    }
  }, [canClockUser]);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date();
      const mStart = startOfMonth(today);
      const mEnd = endOfMonth(today);

      // Fetch today's records for stats
      const todayStr = format(today, "yyyy-MM-dd");
      const todayParams = new URLSearchParams({
        date: todayStr,
        limit: "100",
      });
      const todayRes = await fetch(`/api/attendance?${todayParams.toString()}`);
      if (todayRes.ok) {
        const todayData = await todayRes.json();
        const todayRecords = todayData.records || [];
        const present = todayRecords.filter((r: AttendanceRecord) => r.status === "PRESENT" || r.status === "LATE" || r.status === "HALF_DAY").length;
        const onDuty = todayRecords.filter((r: AttendanceRecord) => r.timeIn && !r.timeOut).length;
        setStats(prev => ({
          ...prev,
          presentToday: canClockUser ? (todayRecords.length > 0 ? 1 : 0) : present,
          onDutyNow: canClockUser ? (todayRecords.some((r: AttendanceRecord) => r.timeIn && !r.timeOut) ? 1 : 0) : onDuty,
        }));

        // Find today's record for the current user (SA or Officer with SA)
        if (canClockUser) {
          const myRecord = todayRecords.find((r: AttendanceRecord) => r.userId === userId);
          setTodayRecord(myRecord || null);
          if (myRecord) {
            if (myRecord.timeIn && !myRecord.timeOut) {
              if (myRecord.breakStart && !myRecord.breakEnd) {
                setDutyStatus("on_break");
              } else {
                setDutyStatus("on_duty");
              }
            } else {
              setDutyStatus("off_duty");
            }
            setOfficeName(myRecord.location || "Office");
          } else {
            setDutyStatus("off_duty");
          }
        }
      }

      // Fetch monthly hours
      const monthParams = new URLSearchParams({
        startDate: format(mStart, "yyyy-MM-dd"),
        endDate: format(mEnd, "yyyy-MM-dd"),
        limit: "500",
      });
      const monthRes = await fetch(`/api/attendance?${monthParams.toString()}`);
      if (monthRes.ok) {
        const monthData = await monthRes.json();
        const monthRecords = monthData.records || [];
        const totalHours = monthRecords
          .filter((r: AttendanceRecord) => canClockUser ? r.userId === userId : true)
          .reduce((sum: number, r: AttendanceRecord) => sum + (r.totalHours || 0), 0);
        setStats(prev => ({ ...prev, totalHoursMonth: Math.round(totalHours * 10) / 10 }));
      }
    } catch {
      // Ignore
    }
  }, [canClockUser, userId]);

  useEffect(() => {
    fetchRecords();
    fetchCorrections();
    fetchStats();
    fetchSystemSettings();
    fetchTodaySchedule();
  }, [fetchRecords, fetchCorrections, fetchStats, fetchSystemSettings, fetchTodaySchedule]);

  useEffect(() => {
    fetchCalendarRecords(calendarMonth);
  }, [calendarMonth, fetchCalendarRecords]);

  // ============== CLOCK ACTIONS ==============
  const handleClockAction = async (action: "clock_in" | "clock_out" | "break_start" | "break_end") => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to process action");
        return;
      }

      toast.success(data.message || "Action completed successfully");

      // Optimistic update: immediately update duty status
      if (action === "clock_in") {
        setDutyStatus("on_duty");
        setTodayRecord(prev => prev ? prev : {
          id: data.record?.id || "",
          userId: userId || "",
          firstName: "",
          lastName: "",
          email: "",
          college: null,
          program: null,
          officeName: null,
          officeCode: null,
          date: new Date().toISOString(),
          timeIn: data.record?.timeIn || new Date().toISOString(),
          timeOut: null,
          breakStart: null,
          breakEnd: null,
          totalHours: 0,
          status: data.record?.status || "PRESENT",
          isCorrected: false,
          notes: data.record?.notes || null,
          location: data.record?.location || officeName,
        });
      } else if (action === "clock_out") {
        setDutyStatus("off_duty");
        setTodayRecord(prev => prev ? {
          ...prev,
          timeOut: data.record?.timeOut || new Date().toISOString(),
          totalHours: data.record?.totalHours || 0,
          status: data.record?.status || prev.status,
        } : prev);
      } else if (action === "break_start") {
        setDutyStatus("on_break");
      } else if (action === "break_end") {
        setDutyStatus("on_duty");
      }

      // Then refetch from server to reconcile
      await Promise.all([
        fetchRecords(),
        fetchStats(),
        fetchCalendarRecords(calendarMonth),
      ]);
    } catch {
      toast.error("Failed to process action");
    } finally {
      setLoadingAction(false);
    }
  };

  // ============== CORRECTION REQUEST ==============
  const handleRequestCorrection = () => {
    if (!todayRecord) return;
    setCorrectionRecord(todayRecord);
    setCorrectionForm({
      timeIn: todayRecord.timeIn ? format(parseISO(todayRecord.timeIn), "HH:mm") : "",
      timeOut: todayRecord.timeOut ? format(parseISO(todayRecord.timeOut), "HH:mm") : "",
      reason: "",
    });
    setCorrectionDialogOpen(true);
  };

  const submitCorrection = async () => {
    if (!correctionRecord || !correctionForm.reason.trim()) {
      toast.error("Please provide a reason for the correction");
      return;
    }

    try {
      const todayDate = format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/attendance/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: correctionRecord.id,
          requestedTimeIn: correctionForm.timeIn ? `${todayDate}T${correctionForm.timeIn}:00` : null,
          requestedTimeOut: correctionForm.timeOut ? `${todayDate}T${correctionForm.timeOut}:00` : null,
          reason: correctionForm.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit correction");
        return;
      }

      toast.success("Correction request submitted successfully");
      setCorrectionDialogOpen(false);
      fetchCorrections();
    } catch {
      toast.error("Failed to submit correction");
    }
  };

  // ============== REVIEW CORRECTION ==============
  const handleReview = (correction: CorrectionRequest, action: "approve" | "reject") => {
    setReviewCorrection(correction);
    setReviewAction(action);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (!reviewCorrection) return;
    setSubmittingReview(true);

    try {
      const res = await fetch(`/api/attendance/corrections/${reviewCorrection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          reviewNotes: reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to review correction");
        return;
      }

      toast.success(data.message || `Correction ${reviewAction}d`);
      setReviewDialogOpen(false);
      fetchCorrections();
      fetchRecords();
    } catch {
      toast.error("Failed to review correction");
    } finally {
      setSubmittingReview(false);
    }
  };

  // ============== CALENDAR HELPERS ==============
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth)),
    end: endOfWeek(endOfMonth(calendarMonth)),
  });

  const getCalendarDayStatus = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return calendarRecords.filter((r) => r.date.startsWith(dayStr));
  };

  // ============== ABSENT COUNT ==============
  const absentToday = canClockUser
    ? (!todayRecord ? 1 : (todayRecord.status === "ABSENT" ? 1 : 0))
    : stats.absentToday;

  // ============== LOADING STATE ==============
  if (loading && records.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            {canClockIn ? "Track your daily attendance and working hours" : "Monitor and manage student assistant attendance"}
          </p>
        </div>
        {canClockIn && dutyStatus === "off_duty" && (
          <Button
            onClick={() => handleClockAction("clock_in")}
            disabled={loadingAction}
            className="bg-green-600 hover:bg-green-700"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Clock In
          </Button>
        )}
      </div>

      {/* ============== STUDENT ASSISTANT VIEW: Clock Panel ============== */}
      {canClockIn && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] p-6 text-white">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              {/* Left: Clock Display */}
              <div className="flex flex-col items-center gap-3 md:items-start">
                <div className="flex items-center gap-2">
                  {dutyStatus === "on_duty" && (
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                    </span>
                  )}
                  {dutyStatus === "on_break" && (
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                    </span>
                  )}
                  <span className="text-sm font-medium text-blue-100">
                    {dutyStatus === "on_duty" ? "On Duty" : dutyStatus === "on_break" ? "On Break" : "Off Duty"}
                  </span>
                </div>
                <div className="text-5xl font-bold tracking-tight md:text-6xl">
                  {format(currentTime, "hh:mm:ss a")}
                </div>
                <p className="text-sm text-blue-200">{format(currentTime, "EEEE, MMMM d, yyyy")}</p>
                {/* Schedule info display */}
                {(todaySchedule || (todayRecord?.notes?.includes("Shift:"))) && (
                  <div className="mt-1 flex items-center gap-2 rounded-md bg-blue-500/20 px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-300" />
                    <span className="text-xs text-blue-100">
                      {todaySchedule
                        ? `Shift: ${todaySchedule.startTime} – ${todaySchedule.endTime}`
                        : (() => {
                            const match = todayRecord?.notes?.match(/Shift:\s*([\d:]+)\s*-\s*([\d:]+)/);
                            return match ? `Shift: ${match[1]} – ${match[2]}` : "";
                          })()
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col gap-3">
                {dutyStatus === "off_duty" && !todayRecord && (
                  <Button
                    size="lg"
                    onClick={() => handleClockAction("clock_in")}
                    disabled={loadingAction}
                    className="bg-green-500 hover:bg-green-600 text-white px-8"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Clock In
                  </Button>
                )}
                {dutyStatus === "on_duty" && (
                  <>
                    <Button
                      size="lg"
                      onClick={() => handleClockAction("clock_out")}
                      disabled={loadingAction}
                      className="bg-red-500 hover:bg-red-600 text-white px-8"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Clock Out
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClockAction("break_start")}
                      disabled={loadingAction}
                      className="border-blue-300 text-blue-100 hover:bg-blue-500/30 hover:text-white"
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Start Break
                    </Button>
                  </>
                )}
                {dutyStatus === "on_break" && (
                  <Button
                    size="lg"
                    onClick={() => handleClockAction("break_end")}
                    disabled={loadingAction}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-8"
                  >
                    <Coffee className="mr-2 h-5 w-5" />
                    End Break
                  </Button>
                )}
                {todayRecord && todayRecord.timeOut && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-sm font-medium">Day Complete</p>
                      <p className="text-xs text-blue-200">
                        {todayRecord.totalHours.toFixed(1)} hours logged
                        {todayRecord.status === "OVERTIME" && (
                          <span className="ml-1 text-blue-300">
                            ({Math.min(todayRecord.totalHours, systemSettings.maxWorkHoursPerDay).toFixed(1)}h paid)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's Record Summary */}
          {todayRecord && (
            <div className="border-t bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time In</p>
                    <p className="text-sm font-semibold">
                      {todayRecord.timeIn ? format(parseISO(todayRecord.timeIn), "hh:mm a") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time Out</p>
                    <p className="text-sm font-semibold">
                      {todayRecord.timeOut ? format(parseISO(todayRecord.timeOut), "hh:mm a") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="text-sm font-semibold">{todayRecord.totalHours.toFixed(1)}h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-violet-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-semibold truncate">{todayRecord.location || "—"}</p>
                  </div>
                </div>
              </div>
              {/* Status badge row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {todayRecord.status && attendanceStatusConfig[todayRecord.status] && (
                  <Badge className={`${attendanceStatusConfig[todayRecord.status].color} text-[10px]`} variant="secondary">
                    {attendanceStatusConfig[todayRecord.status].label}
                  </Badge>
                )}
                {todayRecord.isCorrected && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Corrected</span>
                  </span>
                )}
              </div>
              {/* Status-specific info */}
              <div className="mt-2 flex flex-col gap-1">
                {todayRecord.status === "OVERTIME" && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Overtime: {todayRecord.totalHours.toFixed(1)}h total, {Math.min(todayRecord.totalHours, systemSettings.maxWorkHoursPerDay).toFixed(1)}h will be paid (max {systemSettings.maxWorkHoursPerDay}h/day)
                  </p>
                )}
                {todayRecord.status === "UNDERTIME" && (
                  <p className="text-[11px] text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="inline h-3 w-3 mr-1" />
                    Clocked out more than 15 minutes before scheduled end time
                  </p>
                )}
                {todayRecord.status === "LATE" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Clocked in after {systemSettings.lateGraceMinutes}-minute grace period
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Info footer for SA clock panel */}
          <div className="border-t bg-slate-100/60 px-4 py-2.5 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Grace period: {systemSettings.lateGraceMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Max duty: {systemSettings.maxWorkHoursPerDay}h/day
              </span>
              <span className="flex items-center gap-1">
                <Coffee className="h-3 w-3" />
                Break time excluded from hours
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ============== STATS BAR ============== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Present Today", count: stats.presentToday, icon: UserCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "On Duty Now", count: stats.onDutyNow, icon: Activity, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Absent Today", count: absentToday, icon: UserX, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
          { label: "Hours This Month", count: stats.totalHoursMonth.toFixed(1), icon: Timer, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-4 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============== MAIN CONTENT TABS ============== */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white dark:bg-slate-800">
          <TabsTrigger value="records">
            <ClipboardList className="mr-2 h-4 w-4" />
            {isSA ? "My Records" : "Records"}
          </TabsTrigger>
          {!isSA && (
            <TabsTrigger value="corrections">
              <FileEdit className="mr-2 h-4 w-4" />
              Corrections
              {corrections.filter((c) => c.status === "PENDING").length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
                  {corrections.filter((c) => c.status === "PENDING").length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ============== RECORDS TAB ============== */}
        <TabsContent value="records" className="space-y-4 mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar View */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Calendar
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium min-w-[100px] text-center">
                      {format(calendarMonth, "MMMM yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const dayRecords = getCalendarDayStatus(day);
                    const inMonth = isSameMonth(day, calendarMonth);
                    const today = isToday(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`relative flex flex-col items-center justify-center rounded-md p-1 min-h-[36px] text-xs ${
                          !inMonth ? "text-muted-foreground/30" : ""
                        } ${today ? "bg-blue-100 dark:bg-blue-900/30 font-bold" : ""}`}
                      >
                        <span className={today ? "text-[#1e3a8a] dark:text-blue-300" : ""}>
                          {format(day, "d")}
                        </span>
                        {dayRecords.length > 0 && inMonth && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayRecords.slice(0, 3).map((r) => (
                              <div
                                key={r.id}
                                className={`h-1.5 w-1.5 rounded-full ${attendanceStatusConfig[r.status]?.dotColor || "bg-slate-400"}`}
                                title={`${attendanceStatusConfig[r.status]?.label || r.status}: ${r.totalHours}h`}
                              />
                            ))}
                            {dayRecords.length > 3 && (
                              <span className="text-[8px] text-muted-foreground">+{dayRecords.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-2">
                  {["PRESENT", "LATE", "ABSENT", "HALF_DAY", "UNDERTIME", "OVERTIME"].map((status) => (
                    <div key={status} className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${attendanceStatusConfig[status].dotColor}`} />
                      <span className="text-[10px] text-muted-foreground">{attendanceStatusConfig[status].label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Records List */}
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                {/* Filters (only for non-SA) */}
                {!isSA && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
                    <div className="relative flex-1 sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by SA name..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <BetterSelect value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} placeholder="Status" className="w-[140px]">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PRESENT">Present</SelectItem>
                        <SelectItem value="ABSENT">Absent</SelectItem>
                        <SelectItem value="LATE">Late</SelectItem>
                        <SelectItem value="HALF_DAY">Half Day</SelectItem>
                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                        <SelectItem value="UNDERTIME">Undertime</SelectItem>
                        <SelectItem value="OVERTIME">Overtime</SelectItem>
                      </BetterSelect>
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                          className="w-[140px] text-xs"
                          placeholder="Start"
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                          className="w-[140px] text-xs"
                          placeholder="End"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Records Table */}
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="text-sm font-medium text-muted-foreground">No attendance records found</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isSA ? "Clock in to start tracking your attendance" : "No records match your filters"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium text-muted-foreground text-xs">Date</th>
                          {!isSA && <th className="pb-3 font-medium text-muted-foreground text-xs">SA Name</th>}
                          <th className="pb-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Office</th>
                          <th className="pb-3 font-medium text-muted-foreground text-xs">Time In</th>
                          <th className="pb-3 font-medium text-muted-foreground text-xs">Time Out</th>
                          <th className="pb-3 font-medium text-muted-foreground text-xs">Hours</th>
                          <th className="pb-3 font-medium text-muted-foreground text-xs">Status</th>
                          {isSA && <th className="pb-3 font-medium text-muted-foreground text-xs"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record) => {
                          const statusCfg = attendanceStatusConfig[record.status] || attendanceStatusConfig.PRESENT;
                          return (
                            <tr key={record.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-3 pr-3">
                                <span className="font-medium">{format(parseISO(record.date), "MMM d, yyyy")}</span>
                                {isToday(parseISO(record.date)) && (
                                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-[10px]">Today</Badge>
                                )}
                              </td>
                              {!isSA && (
                                <td className="py-3 pr-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                                      {record.firstName.charAt(0)}{record.lastName.charAt(0)}
                                    </div>
                                    <span className="truncate max-w-[120px]">{record.firstName} {record.lastName}</span>
                                  </div>
                                </td>
                              )}
                              <td className="py-3 pr-3 hidden sm:table-cell">
                                <span className="text-muted-foreground text-xs truncate block max-w-[100px]">{record.officeName || "—"}</span>
                              </td>
                              <td className="py-3 pr-3 text-xs">
                                {record.timeIn ? format(parseISO(record.timeIn), "hh:mm a") : "—"}
                              </td>
                              <td className="py-3 pr-3 text-xs">
                                {record.timeOut ? format(parseISO(record.timeOut), "hh:mm a") : (
                                  record.timeIn ? (
                                    <span className="text-green-600 font-medium">Active</span>
                                  ) : "—"
                                )}
                              </td>
                              <td className="py-3 pr-3 font-medium text-xs">
                                {record.totalHours > 0 ? `${record.totalHours.toFixed(1)}h` : "—"}
                              </td>
                              <td className="py-3 pr-3">
                                <Badge className={`${statusCfg.color} text-[10px]`} variant="secondary">
                                  {record.isCorrected && (
                                    <AlertTriangle className="mr-1 h-3 w-3" />
                                  )}
                                  {statusCfg.label}
                                </Badge>
                              </td>
                              {isSA && (
                                <td className="py-3">
                                  {(record.isCorrected || (record.timeIn && record.timeOut)) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-muted-foreground"
                                      onClick={() => {
                                        setCorrectionRecord(record);
                                        setCorrectionForm({
                                          timeIn: record.timeIn ? format(parseISO(record.timeIn), "HH:mm") : "",
                                          timeOut: record.timeOut ? format(parseISO(record.timeOut), "HH:mm") : "",
                                          reason: "",
                                        });
                                        setCorrectionDialogOpen(true);
                                      }}
                                    >
                                      <FileEdit className="mr-1 h-3 w-3" />
                                      Request Correction
                                    </Button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {total > limit && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {Math.ceil(total / limit)}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============== CORRECTIONS TAB (Admin Only) ============== */}
        {!isSA && (
          <TabsContent value="corrections" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  Correction Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {corrections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileEdit className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="text-sm font-medium text-muted-foreground">No correction requests</h3>
                    <p className="mt-1 text-xs text-muted-foreground">All correction requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {corrections.map((correction) => {
                      const corrStatusCfg = correctionStatusConfig[correction.status] || correctionStatusConfig.PENDING;
                      return (
                        <div
                          key={correction.id}
                          className={`rounded-lg border p-4 transition-all hover:shadow-sm ${
                            correction.status === "PENDING" ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10" : ""
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate max-w-[200px]">{correction.requesterName}</span>
                                <Badge className={`${corrStatusCfg.color} text-[10px] shrink-0`} variant="secondary">
                                  {corrStatusCfg.label}
                                </Badge>
                                {correction.officeName && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">• {correction.officeName}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(correction.date), "MMM d, yyyy")}
                              </p>

                              {/* Current vs Requested */}
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="rounded bg-white dark:bg-slate-800 p-2 text-xs">
                                  <p className="font-medium text-muted-foreground mb-1">Current</p>
                                  <div className="space-y-0.5">
                                    <p>In: {correction.currentTimeIn ? format(parseISO(correction.currentTimeIn), "hh:mm a") : "—"}</p>
                                    <p>Out: {correction.currentTimeOut ? format(parseISO(correction.currentTimeOut), "hh:mm a") : "—"}</p>
                                    <p>Hours: {correction.currentTotalHours.toFixed(1)}h</p>
                                  </div>
                                </div>
                                <div className="rounded bg-blue-50 dark:bg-blue-900/20 p-2 text-xs">
                                  <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Requested</p>
                                  <div className="space-y-0.5">
                                    <p>In: {correction.requestedTimeIn ? format(parseISO(correction.requestedTimeIn), "hh:mm a") : "—"}</p>
                                    <p>Out: {correction.requestedTimeOut ? format(parseISO(correction.requestedTimeOut), "hh:mm a") : "—"}</p>
                                  </div>
                                </div>
                              </div>

                              <p className="mt-2 text-xs text-muted-foreground break-words">
                                <span className="font-medium">Reason: </span><span className="break-words">{correction.reason}</span>
                              </p>

                              {correction.reviewNotes && (
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 break-words">
                                  <span className="font-medium">Review: </span><span className="break-words">{correction.reviewNotes}</span>
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            {correction.status === "PENDING" && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs h-8"
                                  onClick={() => handleReview(correction, "approve")}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs h-8"
                                  onClick={() => handleReview(correction, "reject")}
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ============== CORRECTION REQUEST DIALOG (SA) ============== */}
      <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Attendance Correction</DialogTitle>
          </DialogHeader>
          {correctionRecord && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Request a correction for your attendance on{" "}
                <span className="font-medium text-foreground">{format(parseISO(correctionRecord.date), "MMMM d, yyyy")}</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Requested Time In</Label>
                  <Input
                    type="time"
                    value={correctionForm.timeIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, timeIn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Requested Time Out</Label>
                  <Input
                    type="time"
                    value={correctionForm.timeOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, timeOut: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Reason</Label>
                <Textarea
                  placeholder="Explain why you need this correction..."
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCorrectionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                  onClick={submitCorrection}
                  disabled={!correctionForm.reason.trim()}
                >
                  Submit Request
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============== REVIEW CORRECTION DIALOG (Admin) ============== */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Correction Request
            </DialogTitle>
          </DialogHeader>
          {reviewCorrection && (
            <div className="space-y-4">
              <p className="text-sm">
                <span className="font-medium">{reviewCorrection.requesterName}</span> requests a correction for{" "}
                <span className="font-medium">{format(parseISO(reviewCorrection.date), "MMM d, yyyy")}</span>
              </p>

              <div className="rounded bg-slate-50 dark:bg-slate-800 p-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">Current In:</span> {reviewCorrection.currentTimeIn ? format(parseISO(reviewCorrection.currentTimeIn), "hh:mm a") : "—"}</p>
                <p><span className="text-muted-foreground">Current Out:</span> {reviewCorrection.currentTimeOut ? format(parseISO(reviewCorrection.currentTimeOut), "hh:mm a") : "—"}</p>
                <p><span className="text-muted-foreground">Requested In:</span> {reviewCorrection.requestedTimeIn ? format(parseISO(reviewCorrection.requestedTimeIn), "hh:mm a") : "—"}</p>
                <p><span className="text-muted-foreground">Requested Out:</span> {reviewCorrection.requestedTimeOut ? format(parseISO(reviewCorrection.requestedTimeOut), "hh:mm a") : "—"}</p>
                <p><span className="text-muted-foreground">Reason:</span> {reviewCorrection.reason}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Review Notes (optional)</Label>
                <Textarea
                  placeholder={reviewAction === "approve" ? "Add any notes..." : "Reason for rejection..."}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                  onClick={submitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? "Processing..." : reviewAction === "approve" ? "Approve" : "Reject"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
