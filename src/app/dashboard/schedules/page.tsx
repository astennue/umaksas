"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TimeSlotGrid from "@/components/schedules/time-slot-grid";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ScheduleGrid from "@/components/schedules/schedule-grid";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";
import { SelectItem } from "@/components/ui/select";
import { BetterSelect } from "@/components/ui/better-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useConfirm } from "@/hooks/use-confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Building2,
  CheckCircle,
  XCircle,
  Filter,
  LayoutList,
  LayoutGrid,
  Calendar,
  Trash2,
  Edit,
  Eye,
  Briefcase,
  BookOpen,
  PartyPopper,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduleItem {
  id: string;
  userId: string;
  type: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
  officeId: string | null;
  semester: string | null;
  academicYear: string | null;
  status: string;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  office: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

interface ScheduleStats {
  total: number;
  approved: number;
  pending: number;
  thisSemester: number;
}

interface OfficeOption {
  id: string;
  name: string;
  code: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", full: "Sunday" },
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
];

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Briefcase; color: string; bg: string; border: string }> = {
  WORK: {
    label: "Work",
    icon: Briefcase,
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  CLASS: {
    label: "Class",
    icon: BookOpen,
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  EVENT: {
    label: "Event",
    icon: PartyPopper,
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
  },
  BREAK: {
    label: "Break",
    icon: Coffee,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-700",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}



// ─── Main Component ──────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;

  const canApprove = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");
  const canDelete = userRole === "SUPER_ADMIN" || userRole === "ADVISER";
  const canCreate = ["SUPER_ADMIN", "ADVISER", "OFFICER", "STUDENT_ASSISTANT"].includes(userRole || "");
  const isSA = userRole === "STUDENT_ASSISTANT";

  // Data state
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({ total: 0, approved: 0, pending: 0, thisSemester: 0 });
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");

  // View state
  const [viewMode, setViewMode] = useState<"weekly" | "list" | "grid">("grid");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSchedule, setDetailSchedule] = useState<ScheduleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { confirm, ConfirmDialog } = useConfirm();

  // Day schedules for the time grid (existing schedules on the selected day)
  const [daySchedules, setDaySchedules] = useState<ScheduleItem[]>([]);
  const prevDayRef = useRef<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "WORK",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "12:00",
    location: "",
    officeId: "",
    notes: "",
  });
  const [formTargetUserId, setFormTargetUserId] = useState("");

  // ─── Fetch Schedules ────────────────────────────────────────────────────

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dayFilter !== "all") params.set("dayOfWeek", dayFilter);

      const res = await fetch(`/api/schedules?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
      setTotal(data.total || 0);
      setStats(data.stats || { total: 0, approved: 0, pending: 0, thisSemester: 0 });
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, dayFilter]);

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices?limit=200");
      if (!res.ok) return;
      const data = await res.json();
      const officeList: OfficeOption[] = (data.offices || []).map(
        (office: { id: string; name: string; code: string | null }) => ({
          id: office.id,
          name: office.name,
          code: office.code,
        })
      );
      setOffices(officeList);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchOffices();
  }, [fetchSchedules, fetchOffices]);

  // ─── Form Handlers ──────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      type: isSA ? "WORK" : "WORK",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "09:00",
      location: "",
      officeId: "",
      notes: "",
    });
    setFormTargetUserId(userId || "");
    setEditingSchedule(null);
    setDaySchedules([]);
    prevDayRef.current = null;
  };

  const fetchDaySchedules = useCallback(async (dayOfWeek: number, excludeId?: string) => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        dayOfWeek: dayOfWeek.toString(),
      });
      const res = await fetch(`/api/schedules?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const filtered = (data.schedules || []).filter(
        (s: ScheduleItem) =>
          s.dayOfWeek === dayOfWeek &&
          (s.status === "APPROVED" || s.status === "PENDING") &&
          s.id !== excludeId
      );
      setDaySchedules(filtered);
    } catch {
      // Ignore fetch errors
    }
  }, []);

  const openCreateForm = () => {
    resetForm();
    setDaySchedules([]);
    setFormOpen(true);
  };

  const openEditForm = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setFormData({
      type: schedule.type,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location || "",
      officeId: schedule.officeId || "",
      notes: schedule.notes || "",
    });
    setFormTargetUserId(schedule.userId);
    // Pre-fetch day schedules for the time grid
    fetchDaySchedules(schedule.dayOfWeek, schedule.id);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (formData.startTime >= formData.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type: formData.type,
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location || null,
        officeId: formData.officeId || null,
        notes: formData.notes || null,
      };

      if (!isSA && formTargetUserId) {
        body.userId = formTargetUserId;
      }

      let res: Response;
      if (editingSchedule) {
        res = await fetch(`/api/schedules/${editingSchedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save schedule");
      }

      toast.success(editingSchedule ? "Schedule updated" : "Schedule created");
      setFormOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Approval Handlers ──────────────────────────────────────────────────

  const handleApprove = async (schedule: ScheduleItem) => {
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve schedule");
      }
      toast.success("Schedule approved");
      fetchSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve schedule");
    }
  };

  const handleReject = async (schedule: ScheduleItem, reason?: string) => {
    const rejectReason = reason !== undefined
      ? reason
      : prompt("Reason for rejection (optional):");
    if (rejectReason === null) return; // User cancelled

    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", notes: rejectReason || schedule.notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject schedule");
      }
      toast.success("Schedule rejected");
      fetchSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject schedule");
    }
  };

  // ─── Grid Create Handler ───────────────────────────────────────────────

  const handleGridCreate = useCallback((data: {
    type: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => {
    // Open the create form pre-filled with the grid slot data
    setFormData({
      type: data.type,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      location: "",
      officeId: "",
      notes: "",
    });
    setEditingSchedule(null);
    setFormTargetUserId(userId || "");
    setFormOpen(true);
  }, [userId]);

  // ─── Delete Handler ─────────────────────────────────────────────────────

  const handleDeleteSchedule = async (schedule: ScheduleItem, onClose?: () => void) => {
    const typeLabel = TYPE_CONFIG[schedule.type]?.label || "schedule";
    const dayLabel = DAYS_OF_WEEK[schedule.dayOfWeek]?.full || "";
    const ok = await confirm({
      title: "Delete Schedule",
      description: `Delete the ${typeLabel} on ${dayLabel} (${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)})? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete schedule");
      }
      toast.success("Schedule deleted");
      onClose?.();
      fetchSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete schedule");
    }
  };

  // ─── Fetch day schedules when form day changes ──────────────────────
  useEffect(() => {
    if (!formOpen) return;
    const currentDay = formData.dayOfWeek;
    if (prevDayRef.current !== currentDay) {
      prevDayRef.current = currentDay;
      fetchDaySchedules(currentDay, editingSchedule?.id);
    }
  }, [formOpen, formData.dayOfWeek, fetchDaySchedules, editingSchedule?.id]);

  // ─── Filtered Schedules for weekly view (grouped by day) ────────────────

  const schedulesByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    schedules: schedules.filter((s) => s.dayOfWeek === day.value),
  }));

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading && schedules.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <CRUDToolbar
        title="Schedules"
        entityLabel="Schedules"
        onAdd={canCreate ? openCreateForm : undefined}
      />

      {/* SA Approval Banner */}
      {isSA && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Schedule changes require adviser approval
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              When you create or update a schedule, it will be submitted as pending for review.
              You&apos;ll be notified once it&apos;s approved or rejected.
            </p>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Schedules", count: stats.total, icon: CalendarDays, color: "text-slate-900 dark:text-white" },
          { label: "Approved", count: stats.approved, icon: CheckCircle, color: "text-green-600" },
          { label: "Pending", count: stats.pending, icon: Clock, color: "text-amber-600" },
          { label: "This Semester", count: stats.thisSemester, icon: Calendar, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-3 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <BetterSelect value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }} placeholder="All Types" className="w-[140px]">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="WORK">Work</SelectItem>
              <SelectItem value="CLASS">Class</SelectItem>
              <SelectItem value="EVENT">Event</SelectItem>
              <SelectItem value="BREAK">Break</SelectItem>
          </BetterSelect>

          <BetterSelect value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} placeholder="All Statuses" className="w-[140px]">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
          </BetterSelect>

          <BetterSelect value={dayFilter} onValueChange={(v) => { setDayFilter(v); setPage(1); }} placeholder="All Days" className="w-[140px]">
              <SelectItem value="all">All Days</SelectItem>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d.value} value={d.value.toString()}>
                  {d.full}
                </SelectItem>
              ))}
          </BetterSelect>
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "weekly" | "list" | "grid")}>
          <TabsList className="h-9">
            <TabsTrigger value="grid" className="px-3">
              <Grid3x3 className="mr-1.5 h-3.5 w-3.5" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="weekly" className="px-3">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="list" className="px-3">
              <LayoutList className="mr-1.5 h-3.5 w-3.5" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Empty State */}
      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No schedules found"
          description={
            typeFilter !== "all" || statusFilter !== "all" || dayFilter !== "all"
              ? "Try adjusting your filters"
              : canCreate
                ? "Create your first schedule to get started"
                : "No schedules have been created yet"
          }
          action={canCreate ? { label: "Add Schedule", onClick: openCreateForm, variant: "outline" } : undefined}
        />
      ) : viewMode === "grid" ? (
        /* ─── Grid View (Time Grid) ──────────────────────────────────────── */
        <ScheduleGrid
          schedules={schedules}
          canApprove={canApprove}
          canCreate={canCreate}
          isSA={isSA}
          offices={offices}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelete={handleDeleteSchedule}
          onCreateSchedule={handleGridCreate}
          onViewDetail={(schedule) => { setDetailSchedule(schedule); setDetailOpen(true); }}
        />
      ) : viewMode === "weekly" ? (
        /* ─── Weekly View ─────────────────────────────────────────────────── */
        <div className="space-y-3">
          {/* Desktop: 7-column grid */}
          <div className="hidden gap-2 md:grid md:grid-cols-7">
            {schedulesByDay.map((day) => (
              <div key={day.value} className="min-w-0">
                {/* Day Header */}
                <div className="mb-2 flex items-center justify-between rounded-lg bg-[#1e3a8a] px-3 py-2 text-white">
                  <span className="text-xs font-bold">{day.full}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white text-[10px] px-1.5">
                    {day.schedules.length}
                  </Badge>
                </div>

                {/* Day Column */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                  {day.schedules.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">No schedules</p>
                  ) : (
                    day.schedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        canApprove={canApprove}
                        canDelete={canDelete || (isSA && schedule.status === "PENDING")}
                        onApprove={() => { handleApprove(schedule); }}
                        onReject={() => { handleReject(schedule); }}
                        onEdit={() => { openEditForm(schedule); }}
                        onDelete={() => { handleDeleteSchedule(schedule); }}
                        onView={() => { setDetailSchedule(schedule); setDetailOpen(true); }}
                        compact
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: horizontal scrollable day columns */}
          <div className="md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {schedulesByDay.map((day) => (
                <div key={day.value} className="min-w-[260px] flex-shrink-0">
                  {/* Day Header */}
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-[#1e3a8a] px-3 py-2 text-white">
                    <span className="text-xs font-bold">{day.full}</span>
                    <Badge variant="secondary" className="bg-white/20 text-white text-[10px] px-1.5">
                      {day.schedules.length}
                    </Badge>
                  </div>

                  {/* Day Column */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                    {day.schedules.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No schedules</p>
                    ) : (
                      day.schedules.map((schedule) => (
                        <ScheduleCard
                          key={schedule.id}
                          schedule={schedule}
                          canApprove={canApprove}
                          canDelete={canDelete || (isSA && schedule.status === "PENDING")}
                          onApprove={() => { handleApprove(schedule); }}
                          onReject={() => { handleReject(schedule); }}
                          onEdit={() => { openEditForm(schedule); }}
                          onDelete={() => { handleDeleteSchedule(schedule); }}
                          onView={() => { setDetailSchedule(schedule); setDetailOpen(true); }}
                          compact
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ─── List View ───────────────────────────────────────────────────── */
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <ScheduleListRow
              key={schedule.id}
              schedule={schedule}
              canApprove={canApprove}
              canDelete={canDelete || (isSA && schedule.status === "PENDING")}
              canEdit={!isSA || schedule.status === "PENDING"}
              onApprove={() => { handleApprove(schedule); }}
              onReject={() => { handleReject(schedule); }}
              onEdit={() => { openEditForm(schedule); }}
              onDelete={() => { handleDeleteSchedule(schedule); }}
              onView={() => { setDetailSchedule(schedule); setDetailOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ─── Create / Edit Dialog ────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Edit Schedule" : "Add Schedule"}
            </DialogTitle>
            <DialogDescription>
              {editingSchedule
                ? "Update the schedule details below."
                : "Create a new schedule entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Target User (admin only) */}
            {!isSA && !editingSchedule && (
              <div className="space-y-2">
                <Label htmlFor="targetUser">Assign To (User ID or Email)</Label>
                <Input
                  id="targetUser"
                  placeholder="Enter user ID or email"
                  value={formTargetUserId}
                  onChange={(e) => setFormTargetUserId(e.target.value)}
                />
              </div>
            )}

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <BetterSelect
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
                disabled={isSA}
              >
                  <SelectItem value="WORK">Work</SelectItem>
                  {!isSA && <SelectItem value="CLASS">Class</SelectItem>}
                  {!isSA && <SelectItem value="EVENT">Event</SelectItem>}
                  {!isSA && <SelectItem value="BREAK">Break</SelectItem>}
              </BetterSelect>
              {isSA && (
                <p className="text-xs text-muted-foreground">Student assistants can only create work schedules</p>
              )}
            </div>

            {/* Day of Week */}
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <BetterSelect
                value={formData.dayOfWeek.toString()}
                onValueChange={(v) => setFormData({ ...formData, dayOfWeek: parseInt(v, 10) })}
              >
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value.toString()}>
                      {d.full}
                    </SelectItem>
                  ))}
              </BetterSelect>
            </div>

            {/* Time Range - 30-min slot grid */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Time Range
              </Label>
              <TimeSlotGrid
                dayOfWeek={formData.dayOfWeek}
                existingSchedules={daySchedules.map((s) => ({
                  id: s.id,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  status: s.status,
                  type: s.type,
                  location: s.location,
                  office: s.office,
                  user: { firstName: s.user.firstName, lastName: s.user.lastName },
                }))}
                startTime={formData.startTime}
                endTime={formData.endTime}
                editingScheduleId={editingSchedule?.id}
                onStartTimeChange={(time) => setFormData({ ...formData, startTime: time })}
                onEndTimeChange={(time) => setFormData({ ...formData, endTime: time })}
                showApprovalBanner={isSA}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Room number, building, etc."
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            {/* Office */}
            <div className="space-y-2">
              <Label>Office</Label>
              <BetterSelect
                value={formData.officeId}
                onValueChange={(v) => setFormData({ ...formData, officeId: v })}
                placeholder="Select office"
              >
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
              </BetterSelect>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {isSubmitting
                ? "Saving..."
                : editingSchedule
                  ? "Update Schedule"
                  : "Create Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ───────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
          </DialogHeader>
          {detailSchedule && (
            <div className="space-y-4">
              {/* Type Badge */}
              <div className="flex items-center gap-2">
                {(() => {
                  const config = TYPE_CONFIG[detailSchedule.type] || TYPE_CONFIG.WORK;
                  const Icon = config.icon;
                  return (
                    <Badge className={`${config.bg} ${config.color} ${config.border} border`} variant="secondary">
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  );
                })()}
                <Badge className={STATUS_CONFIG[detailSchedule.status]?.color || ""} variant="secondary">
                  {STATUS_CONFIG[detailSchedule.status]?.label || detailSchedule.status}
                </Badge>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-semibold">
                  {detailSchedule.user.firstName?.charAt(0)}{detailSchedule.user.lastName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {detailSchedule.user.firstName} {detailSchedule.user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{detailSchedule.user.email}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{DAYS_OF_WEEK[detailSchedule.dayOfWeek]?.full || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(detailSchedule.startTime)} - {formatTime(detailSchedule.endTime)}
                  </span>
                </div>
                {detailSchedule.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{detailSchedule.location}</span>
                  </div>
                )}
                {detailSchedule.office && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{detailSchedule.office.name}</span>
                  </div>
                )}
                {detailSchedule.semester && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Semester:</span>
                    <span>{detailSchedule.semester} {detailSchedule.academicYear ? `• ${detailSchedule.academicYear}` : ""}</span>
                  </div>
                )}
                {detailSchedule.notes && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground dark:bg-slate-900">
                    {detailSchedule.notes}
                  </div>
                )}
              </div>

              {/* Approval info */}
              {detailSchedule.approvedAt && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  Approved on {new Date(detailSchedule.approvedAt).toLocaleDateString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 border-t pt-4">
                {detailSchedule.status === "PENDING" && canApprove && (
                  <>
                    <Button
                      onClick={() => { handleApprove(detailSchedule); setDetailOpen(false); }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => { handleReject(detailSchedule); setDetailOpen(false); }}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
                {(canDelete || (isSA && detailSchedule.status === "PENDING")) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => { if (!detailSchedule) return; await handleDeleteSchedule(detailSchedule, () => setDetailOpen(false)); }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                )}
                {detailSchedule.status === "PENDING" && (canDelete || isSA) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setDetailOpen(false); openEditForm(detailSchedule); }}
                  >
                    <Edit className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}

// ─── Schedule Card (Weekly View) ─────────────────────────────────────────────

function ScheduleCard({
  schedule,
  canApprove,
  canDelete,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onView,
  compact = false,
}: {
  schedule: ScheduleItem;
  canApprove: boolean;
  canDelete: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  compact?: boolean;
}) {
  const config = TYPE_CONFIG[schedule.type] || TYPE_CONFIG.WORK;
  const statusCfg = STATUS_CONFIG[schedule.status];
  const Icon = config.icon;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md border ${config.border} ${config.bg} group`}
      onClick={onView}
    >
      <CardContent className={compact ? "p-2.5" : "p-3"}>
        {/* Status indicator dot */}
        {schedule.status === "PENDING" && (
          <div className="absolute top-2 right-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
        )}

        {/* Type + Time */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
          <span className={`text-xs font-semibold truncate ${config.color}`}>
            {config.label}
          </span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
          <Clock className="h-3 w-3 shrink-0" />
          <span>
            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
          </span>
        </div>

        {/* Location */}
        {schedule.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{schedule.location}</span>
          </div>
        )}

        {/* Office */}
        {schedule.office && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{schedule.office.name}</span>
          </div>
        )}

        {/* User name (for admin view) */}
        {!compact && (
          <div className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
            <span className="truncate">{schedule.user.firstName} {schedule.user.lastName}</span>
          </div>
        )}

        {/* Status badge */}
        {statusCfg && (
          <div className="mt-1.5">
            <Badge className={`${statusCfg.color} text-[10px] px-1.5 py-0`} variant="secondary">
              {statusCfg.label}
            </Badge>
          </div>
        )}

        {/* Actions (shown on hover) */}
        <div className="mt-2 hidden group-hover:flex items-center gap-1 border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
          {schedule.status === "PENDING" && canApprove && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                onClick={(e) => { e.stopPropagation(); onApprove(); }}
              >
                <CheckCircle className="mr-0.5 h-3 w-3" />
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={(e) => { e.stopPropagation(); onReject(); }}
              >
                <XCircle className="mr-0.5 h-3 w-3" />
                Reject
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Edit className="mr-0.5 h-3 w-3" />
            Edit
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Schedule List Row ───────────────────────────────────────────────────────

function ScheduleListRow({
  schedule,
  canApprove,
  canDelete,
  canEdit,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onView,
}: {
  schedule: ScheduleItem;
  canApprove: boolean;
  canDelete: boolean;
  canEdit: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const config = TYPE_CONFIG[schedule.type] || TYPE_CONFIG.WORK;
  const statusCfg = STATUS_CONFIG[schedule.status];
  const Icon = config.icon;

  return (
    <Card className="transition-all hover:shadow-md cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Type Icon */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>

          {/* Main Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">
                {config.label}
              </span>
              {statusCfg && (
                <Badge className={`${statusCfg.color} text-[10px] px-1.5`} variant="secondary">
                  {statusCfg.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {DAYS_OF_WEEK[schedule.dayOfWeek]?.full}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
              </span>
              {schedule.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3" />
                  {schedule.location}
                </span>
              )}
            </div>
          </div>

          {/* Office + User */}
          <div className="hidden sm:block text-right min-w-0">
            {schedule.office && (
              <p className="text-xs text-muted-foreground truncate">
                {schedule.office.name}
              </p>
            )}
            <p className="text-xs font-medium truncate">
              {schedule.user.firstName} {schedule.user.lastName}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onView(); }}
            >
              <Eye className="mr-1 h-3 w-3" />
              View
            </Button>
            {canEdit && schedule.status === "PENDING" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Button>
            )}
            {schedule.status === "PENDING" && canApprove && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-green-600 hover:text-green-700"
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  <span className="hidden sm:inline">Approve</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-600 hover:text-red-700"
                  onClick={(e) => { e.stopPropagation(); onReject(); }}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  <span className="hidden sm:inline">Reject</span>
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-600 hover:text-red-700"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
