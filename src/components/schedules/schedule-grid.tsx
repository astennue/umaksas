"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Briefcase,
  BookOpen,
  PartyPopper,
  Coffee,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Building2,
  Trash2,
  Plus,
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

interface OfficeOption {
  id: string;
  name: string;
  code: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const GRID_DAYS = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
];

const TYPE_COLORS: Record<string, {
  bg: string;
  bgDark: string;
  border: string;
  text: string;
  textDark: string;
  stripe: string;
  icon: typeof Briefcase;
  label: string;
}> = {
  WORK: {
    bg: "bg-blue-100",
    bgDark: "dark:bg-blue-950/60",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-800",
    textDark: "dark:text-blue-100",
    stripe: "bg-blue-500",
    icon: Briefcase,
    label: "Work",
  },
  CLASS: {
    bg: "bg-emerald-100",
    bgDark: "dark:bg-emerald-950/60",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-800",
    textDark: "dark:text-emerald-200",
    stripe: "bg-emerald-500",
    icon: BookOpen,
    label: "Class",
  },
  EVENT: {
    bg: "bg-violet-100",
    bgDark: "dark:bg-violet-950/60",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-800",
    textDark: "dark:text-violet-200",
    stripe: "bg-violet-500",
    icon: PartyPopper,
    label: "Event",
  },
  BREAK: {
    bg: "bg-slate-100",
    bgDark: "dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-600",
    text: "text-slate-700",
    textDark: "dark:text-slate-300",
    stripe: "bg-slate-400",
    icon: Coffee,
    label: "Break",
  },
};

const STATUS_STYLES: Record<string, {
  stripe: string;
  borderStyle: string;
  opacity?: string;
}> = {
  PENDING: {
    stripe: "bg-amber-500",
    borderStyle: "border-dashed border-2",
  },
  APPROVED: {
    stripe: "bg-green-500",
    borderStyle: "border-solid border",
  },
  REJECTED: {
    stripe: "bg-red-500",
    borderStyle: "border-solid border",
    opacity: "opacity-60",
  },
};

// Time grid: 7:00 AM to 7:00 PM in 30-min increments = 24 slots
const START_HOUR = 7;
const END_HOUR = 19;
const SLOT_HEIGHT_PX = 40; // pixels per 30-min slot
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 24 slots

function generateTimeSlots() {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    slots.push(`${hour12}:00 ${ampm}`);
    slots.push(`${hour12}:30 ${ampm}`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToSlotIndex(minutes: number): number {
  return Math.max(0, minutes - START_HOUR * 60) / 30;
}

function slotIndexToMinutes(index: number): number {
  return START_HOUR * 60 + index * 30;
}

function snapToSlot(minutes: number): number {
  return Math.round((minutes - START_HOUR * 60) / 30) * 30 + START_HOUR * 60;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ScheduleGridProps {
  schedules: ScheduleItem[];
  canApprove: boolean;
  canCreate: boolean;
  isSA: boolean;
  offices: OfficeOption[];
  onApprove: (schedule: ScheduleItem) => void;
  onReject: (schedule: ScheduleItem, reason?: string) => void;
  onDelete: (schedule: ScheduleItem) => void;
  onCreateSchedule: (data: {
    type: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => void;
  onViewDetail: (schedule: ScheduleItem) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ScheduleGrid({
  schedules,
  canApprove,
  canCreate,
  isSA,
  offices,
  onApprove,
  onReject,
  onDelete,
  onCreateSchedule,
  onViewDetail,
}: ScheduleGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const map = new Map<number, ScheduleItem[]>();
    GRID_DAYS.forEach((d) => map.set(d.value, []));
    schedules.forEach((s) => {
      if (s.dayOfWeek >= 1 && s.dayOfWeek <= 6) {
        const arr = map.get(s.dayOfWeek) || [];
        arr.push(s);
        map.set(s.dayOfWeek, arr);
      }
    });
    return map;
  }, [schedules]);

  // ─── Grid Click Handlers ────────────────────────────────────────────────
  const handleEmptySlotClick = (dayOfWeek: number, slotIndex: number) => {
    if (!canCreate || !isSA) return;
    const startTimeMinutes = slotIndexToMinutes(slotIndex);
    const endTimeMinutes = startTimeMinutes + 60; // default 1-hour block
    const startH = Math.floor(startTimeMinutes / 60);
    const startM = startTimeMinutes % 60;
    const endH = Math.floor(endTimeMinutes / 60);
    const endM = endTimeMinutes % 60;
    const startTime = `${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}`;
    const endTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    onCreateSchedule({
      type: "WORK",
      dayOfWeek,
      startTime,
      endTime,
    });
  };

  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT_PX;

  return (
    <div className="rounded-lg border bg-white dark:bg-slate-900">
      {/* Grid Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b">
        <div className="flex">
          {/* Time label spacer */}
          <div className="w-[72px] shrink-0 border-r" />
          {/* Day headers */}
          {GRID_DAYS.map((day) => (
            <div
              key={day.value}
              className="flex-1 min-w-[120px] text-center py-2.5 border-r border-slate-100 dark:border-slate-800 last:border-r-0"
            >
              <span className="text-xs font-bold text-[#1e3a8a] dark:text-blue-300">
                {day.label}
              </span>
              <span className="ml-1.5 text-[10px] text-muted-foreground hidden sm:inline">
                {day.full}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Grid Body */}
      <div className="overflow-auto max-h-[65vh]">
        <div ref={gridRef} className="flex relative" style={{ minHeight: totalHeight }}>
          {/* Time Labels Column */}
          <div className="w-[72px] shrink-0 relative border-r bg-slate-50 dark:bg-slate-900/50">
            {TIME_SLOTS.map((label, idx) => (
              <div
                key={idx}
                className="absolute right-2 text-[10px] text-muted-foreground -translate-y-1/2 select-none"
                style={{ top: idx * SLOT_HEIGHT_PX }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {GRID_DAYS.map((day) => {
            const daySchedules = schedulesByDay.get(day.value) || [];
            return (
              <DayColumn
                key={day.value}
                day={day}
                schedules={daySchedules}
                totalSlots={TOTAL_SLOTS}
                slotHeight={SLOT_HEIGHT_PX}
                canApprove={canApprove}
                canCreate={canCreate}
                isSA={isSA}
                onApprove={onApprove}
                onReject={onReject}
                onDelete={onDelete}
                onViewDetail={onViewDetail}
                onEmptySlotClick={handleEmptySlotClick}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-2.5 text-[11px]">
        <span className="font-medium text-muted-foreground mr-1">Types:</span>
        {Object.entries(TYPE_COLORS).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${cfg.stripe}`} />
            <span className="text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground mx-1">|</span>
        <span className="font-medium text-muted-foreground mr-1">Status:</span>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
          <span className="text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
          <span className="text-muted-foreground">Approved</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
          <span className="text-muted-foreground">Rejected</span>
        </div>
      </div>
    </div>
  );
}

// ─── Day Column ──────────────────────────────────────────────────────────────

function DayColumn({
  day,
  schedules,
  totalSlots,
  slotHeight,
  canApprove,
  canCreate,
  isSA,
  onApprove,
  onReject,
  onDelete,
  onViewDetail,
  onEmptySlotClick,
}: {
  day: { value: number; label: string; full: string };
  schedules: ScheduleItem[];
  totalSlots: number;
  slotHeight: number;
  canApprove: boolean;
  canCreate: boolean;
  isSA: boolean;
  onApprove: (schedule: ScheduleItem) => void;
  onReject: (schedule: ScheduleItem, reason?: string) => void;
  onDelete: (schedule: ScheduleItem) => void;
  onViewDetail: (schedule: ScheduleItem) => void;
  onEmptySlotClick: (dayOfWeek: number, slotIndex: number) => void;
}) {
  return (
    <div className="flex-1 min-w-[120px] relative border-r border-slate-100 dark:border-slate-800 last:border-r-0">
      {/* Grid lines + empty slots */}
      {Array.from({ length: totalSlots }).map((_, idx) => (
        <div
          key={idx}
          className={`border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors cursor-default ${
            canCreate && isSA ? "cursor-pointer" : ""
          }`}
          style={{ height: slotHeight }}
          onClick={() => onEmptySlotClick(day.value, idx)}
        />
      ))}

      {/* Schedule Blocks */}
      {schedules.map((schedule) => {
        const startMinutes = timeToMinutes(schedule.startTime);
        const endMinutes = timeToMinutes(schedule.endTime);
        const startSlot = minutesToSlotIndex(startMinutes);
        const endSlot = minutesToSlotIndex(endMinutes);
        const top = startSlot * slotHeight;
        const height = Math.max((endSlot - startSlot) * slotHeight, slotHeight);

        return (
          <ScheduleBlock
            key={schedule.id}
            schedule={schedule}
            top={top}
            height={height}
            canApprove={canApprove}
            isSA={isSA}
            onViewDetail={onViewDetail}
            onApprove={onApprove}
            onReject={onReject}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

// ─── Schedule Block ──────────────────────────────────────────────────────────

function ScheduleBlock({
  schedule,
  top,
  height,
  canApprove,
  isSA,
  onViewDetail,
  onApprove,
  onReject,
  onDelete,
}: {
  schedule: ScheduleItem;
  top: number;
  height: number;
  canApprove: boolean;
  isSA: boolean;
  onViewDetail: (schedule: ScheduleItem) => void;
  onApprove: (schedule: ScheduleItem) => void;
  onReject: (schedule: ScheduleItem, reason?: string) => void;
  onDelete: (schedule: ScheduleItem) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const typeCfg = TYPE_COLORS[schedule.type] || TYPE_COLORS.WORK;
  const statusStyle = STATUS_STYLES[schedule.status] || STATUS_STYLES.PENDING;
  const Icon = typeCfg.icon;
  const showActions = schedule.status === "PENDING" && (canApprove || (isSA && schedule.userId === schedule.userId));
  const canDeletePending = isSA && schedule.userId === schedule.userId && schedule.status === "PENDING";

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActioning(true);
    onApprove(schedule);
    setTimeout(() => setIsActioning(false), 500);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setIsActioning(true);
    onReject(schedule, rejectReason || undefined);
    setShowRejectInput(false);
    setRejectReason("");
    setTimeout(() => setIsActioning(false), 500);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(schedule);
  };

  const isSmall = height < 50;
  const isVerySmall = height < 35;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={`absolute left-0.5 right-0.5 rounded-md overflow-hidden z-[5] cursor-pointer
            ${typeCfg.bg} ${typeCfg.bgDark}
            ${statusStyle.borderStyle} ${typeCfg.border}
            ${statusStyle.opacity || ""}
            hover:ring-2 hover:ring-[#1e3a8a]/30 hover:z-10
            transition-all duration-150
            group
          `}
          style={{ top, height }}
          onClick={() => onViewDetail(schedule)}
        >
          {/* Status Stripe */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusStyle.stripe}`} />

          {/* Content */}
          <div className="pl-2.5 pr-1 py-1 h-full flex flex-col justify-center">
            {!isVerySmall && (
              <div className="flex items-center gap-1">
                <Icon className={`h-3 w-3 shrink-0 ${typeCfg.text} ${typeCfg.textDark}`} />
                {!isSmall && (
                  <span className={`text-[10px] font-semibold truncate ${typeCfg.text} ${typeCfg.textDark}`}>
                    {typeCfg.label}
                  </span>
                )}
                {!isSA && !isSmall && schedule.user && (
                  <span className="text-[9px] text-muted-foreground truncate ml-auto max-w-[50px]">
                    {schedule.user.firstName}
                  </span>
                )}
              </div>
            )}
            <span className={`leading-tight ${isSmall ? "text-[9px]" : "text-[10px]"} ${typeCfg.text} ${typeCfg.textDark}`}>
              {formatTime(schedule.startTime)}
              {!isVerySmall && (
                <span className="text-muted-foreground">
                  {isSmall ? "-" : " - "}
                  {formatTime(schedule.endTime)}
                </span>
              )}
            </span>
            {!isSmall && schedule.location && (
              <span className="text-[8px] text-muted-foreground truncate mt-0.5">
                {schedule.location}
              </span>
            )}
            {!isSmall && isSA && schedule.office && (
              <span className="text-[8px] text-muted-foreground truncate">
                {schedule.office.name}
              </span>
            )}
          </div>

          {/* Pending pulse */}
          {schedule.status === "PENDING" && (
            <span className="absolute top-1 right-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0"
        side="right"
        align="start"
        sideOffset={8}
      >
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeCfg.bg} ${typeCfg.bgDark}`}>
              <Icon className={`h-4 w-4 ${typeCfg.text} ${typeCfg.textDark}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{typeCfg.label} Schedule</p>
              <p className="text-[11px] text-muted-foreground">
                {GRID_DAYS.find((d) => d.value === schedule.dayOfWeek)?.full}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={
                schedule.status === "PENDING"
                  ? "bg-amber-100 text-amber-700 text-[10px]"
                  : schedule.status === "APPROVED"
                    ? "bg-green-100 text-green-700 text-[10px]"
                    : "bg-red-100 text-red-700 text-[10px]"
              }
            >
              {schedule.status}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
              </span>
            </div>
            {schedule.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>{schedule.location}</span>
              </div>
            )}
            {schedule.office && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span>{schedule.office.name}</span>
              </div>
            )}
            {!isSA && schedule.user && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-[8px] font-bold text-[#1e3a8a]">
                  {schedule.user.firstName?.charAt(0)}{schedule.user.lastName?.charAt(0)}
                </div>
                <span>
                  {schedule.user.firstName} {schedule.user.lastName}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {schedule.notes && (
            <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-2 text-[11px] text-muted-foreground">
              {schedule.notes}
            </div>
          )}

          {/* Reject reason input */}
          {showRejectInput && (
            <div className="space-y-1.5">
              <Label className="text-[11px]">Rejection reason (optional)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason..."
                rows={2}
                className="text-xs"
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t">
            {showActions && canApprove && (
              <>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={isActioning}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 h-7 text-xs"
                  onClick={handleReject}
                  disabled={isActioning}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  {showRejectInput ? "Confirm" : "Reject"}
                </Button>
              </>
            )}
            {canDeletePending && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            )}
            {!showActions && !canDeletePending && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={() => onViewDetail(schedule)}
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
