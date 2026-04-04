"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExistingSchedule {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  location?: string | null;
  office?: { name: string } | null;
  user?: { firstName: string; lastName: string } | null;
}

interface TimeSlotGridProps {
  /** Currently selected day of week (0=Sun .. 6=Sat) */
  dayOfWeek: number;
  /** Existing schedules for this day to show as blocked */
  existingSchedules: ExistingSchedule[];
  /** Currently selected start time "HH:MM" */
  startTime: string;
  /** Currently selected end time "HH:MM" */
  endTime: string;
  /** ID of schedule being edited (exclude from blocking) */
  editingScheduleId?: string;
  /** Called when user selects a new start time */
  onStartTimeChange: (time: string) => void;
  /** Called when user selects a new end time */
  onEndTimeChange: (time: string) => void;
  /** Show the approval warning banner (for SA users) */
  showApprovalBanner?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const START_HOUR = 7;   // 7:00 AM
const END_HOUR = 21;     // 9:00 PM
const SLOT_MINUTES = 30;

function generateSlots(): { time: string; label: string; hour24: number }[] {
  const slots: { time: string; label: string; hour24: number }[] = [];
  for (let totalMin = START_HOUR * 60; totalMin < END_HOUR * 60; totalMin += SLOT_MINUTES) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    slots.push({
      time: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      label: `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`,
      hour24: totalMin,
    });
  }
  return slots;
}

const TIME_SLOTS = generateSlots();

// ─── Helper: time string to minutes ──────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// ─── Helper: check if a time slot is within an existing schedule ─────────────

function getSlotSchedule(
  slotTime: string,
  schedules: ExistingSchedule[],
  excludeId?: string,
): ExistingSchedule | undefined {
  const slotMin = timeToMinutes(slotTime);
  return schedules.find((s) => {
    if (excludeId && s.id === excludeId) return false;
    const startMin = timeToMinutes(s.startTime);
    const endMin = timeToMinutes(s.endTime);
    return slotMin >= startMin && slotMin < endMin;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimeSlotGrid({
  dayOfWeek,
  existingSchedules,
  startTime,
  endTime,
  editingScheduleId,
  onStartTimeChange,
  onEndTimeChange,
  showApprovalBanner = false,
}: TimeSlotGridProps) {
  const [clickState, setClickState] = useState<"idle" | "start_selected">("idle");
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(dayOfWeek);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync active day — reset click state when day changes (derived pattern, no effect needed)
  if (activeDay !== dayOfWeek) {
    setActiveDay(dayOfWeek);
    setClickState("idle");
    setPendingStart(null);
  }

  // Determine the selected slot indices for highlighting
  const selectedStartMin = useMemo(() => timeToMinutes(startTime), [startTime]);
  const selectedEndMin = useMemo(() => timeToMinutes(endTime), [endTime]);

  // Auto-scroll to selected start time when day changes
  useEffect(() => {
    if (scrollRef.current) {
      const startIdx = TIME_SLOTS.findIndex((s) => s.time === startTime);
      if (startIdx >= 0) {
        const slotHeight = 36;
        const scrollTarget = Math.max(0, startIdx * slotHeight - 80);
        scrollRef.current.scrollTop = scrollTarget;
      }
    }
  }, [dayOfWeek, startTime]);

  const handleSlotClick = useCallback(
    (slotTime: string) => {
      const slotSchedule = getSlotSchedule(slotTime, existingSchedules, editingScheduleId);
      if (slotSchedule) return; // Cannot click blocked slots

      if (clickState === "idle") {
        // First click = select start time
        setClickState("start_selected");
        setPendingStart(slotTime);
        onStartTimeChange(slotTime);
        // Reset end time so user must select end
        onEndTimeChange(slotTime);
      } else {
        // Second click = select end time
        const startMin = timeToMinutes(pendingStart || startTime);
        const endMin = timeToMinutes(slotTime);

        if (endMin <= startMin) {
          // If end is before or equal to start, swap or reset
          setClickState("idle");
          setPendingStart(null);
          return;
        }

        onStartTimeChange(pendingStart || startTime);
        onEndTimeChange(slotTime);
        setClickState("idle");
        setPendingStart(null);
      }
    },
    [clickState, pendingStart, startTime, endTime, existingSchedules, editingScheduleId, onStartTimeChange, onEndTimeChange],
  );

  const handleReset = useCallback(() => {
    setClickState("idle");
    setPendingStart(null);
  }, []);

  // Determine display range for highlighting
  const displayStartMin = clickState === "start_selected" && pendingStart
    ? timeToMinutes(pendingStart)
    : selectedStartMin;

  const displayEndMin = clickState === "start_selected" && pendingStart
    ? timeToMinutes(pendingStart) // Only start selected
    : selectedEndMin;

  // Group existing schedules for the legend
  const approvedSchedules = useMemo(
    () => existingSchedules.filter((s) => s.status === "APPROVED" && s.id !== editingScheduleId),
    [existingSchedules, editingScheduleId],
  );
  const pendingSchedules = useMemo(
    () => existingSchedules.filter((s) => s.status === "PENDING" && s.id !== editingScheduleId),
    [existingSchedules, editingScheduleId],
  );

  // Overlap warning
  const hasOverlap = useMemo(() => {
    if (selectedStartMin >= selectedEndMin) return false;
    return existingSchedules.some((s) => {
      if (editingScheduleId && s.id === editingScheduleId) return false;
      const sStart = timeToMinutes(s.startTime);
      const sEnd = timeToMinutes(s.endTime);
      return selectedStartMin < sEnd && selectedEndMin > sStart;
    });
  }, [selectedStartMin, selectedEndMin, existingSchedules, editingScheduleId]);

  return (
    <div className="space-y-3">
      {/* Approval Banner */}
      {showApprovalBanner && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Schedule changes require adviser approval
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Your new or updated schedule will be submitted for review. You&apos;ll be notified once it&apos;s approved.
            </p>
          </div>
        </div>
      )}

      {/* Selection Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {clickState === "start_selected" ? (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Now click an end time slot
            </span>
          ) : (
            <span className="text-muted-foreground">
              {startTime && endTime && selectedEndMin > selectedStartMin
                ? `Selected: ${formatTimeDisplay(startTime)} — ${formatTimeDisplay(endTime)}`
                : "Click to select start time"}
            </span>
          )}
        </div>
        {clickState === "start_selected" && (
          <button
            onClick={handleReset}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* Time Grid */}
      <div
        ref={scrollRef}
        className="rounded-lg border bg-slate-50 dark:bg-slate-900/50 max-h-[280px] overflow-y-auto scrollbar-thin"
      >
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {TIME_SLOTS.map((slot) => {
            const slotMin = slot.hour24;
            const isExisting = getSlotSchedule(slot.time, existingSchedules, editingScheduleId);
            const isSelected =
              slotMin >= displayStartMin && slotMin < displayEndMin && !isExisting;
            const isStart = slot.time === (pendingStart || startTime) && !isExisting;
            const isEnd = slotMin >= displayEndMin - SLOT_MINUTES && slotMin < displayEndMin && !isExisting && displayEndMin > displayStartMin;

            // Check if it's the start boundary
            const isStartBoundary = slot.time === startTime && displayEndMin > displayStartMin;
            // Check if it's the end boundary
            const nextSlotTime = `${String(Math.floor((slotMin + SLOT_MINUTES) / 60)).padStart(2, "0")}:${String((slotMin + SLOT_MINUTES) % 60).padStart(2, "0")}`;
            const isEndBoundary = nextSlotTime === endTime && displayEndMin > displayStartMin;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={!!isExisting}
                onClick={() => handleSlotClick(slot.time)}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-1.5 text-left transition-all",
                  isExisting
                    ? "cursor-not-allowed bg-slate-200/70 dark:bg-slate-800/70"
                    : isSelected
                      ? "bg-blue-100 dark:bg-blue-900/40 cursor-pointer hover:bg-blue-200/80 dark:hover:bg-blue-900/60"
                      : "hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer",
                )}
              >
                {/* Time label */}
                <span
                  className={cn(
                    "w-[72px] shrink-0 text-xs font-mono tabular-nums",
                    isExisting
                      ? "text-slate-400 dark:text-slate-500"
                      : isSelected
                        ? "text-blue-700 dark:text-blue-300 font-semibold"
                        : "text-slate-600 dark:text-slate-400",
                  )}
                >
                  {slot.label}
                </span>

                {/* Slot content / status */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {isExisting ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Lock className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {formatTimeDisplay(isExisting.startTime)} — {formatTimeDisplay(isExisting.endTime)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[9px] px-1.5 py-0 shrink-0",
                          isExisting.status === "APPROVED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        )}
                      >
                        {isExisting.status === "APPROVED" ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  ) : isSelected ? (
                    <div className="flex items-center gap-1">
                      {isStartBoundary && (
                        <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">
                          Start
                        </Badge>
                      )}
                      {isEndBoundary && (
                        <Badge className="bg-blue-800 text-white text-[9px] px-1.5 py-0">
                          End
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-transparent select-none">Available</span>
                  )}
                </div>

                {/* Visual indicator bar */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                )}
                {isExisting && (
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-1 rounded-r",
                      isExisting.status === "APPROVED"
                        ? "bg-green-500"
                        : "bg-amber-500",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overlap Warning */}
      {hasOverlap && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span className="text-xs text-red-700 dark:text-red-400">
            This time range overlaps with an existing schedule. Please choose a different time.
          </span>
        </div>
      )}

      {/* Existing Schedules Summary */}
      {(approvedSchedules.length > 0 || pendingSchedules.length > 0) && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Existing schedules on this day:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {approvedSchedules.map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] gap-1"
              >
                <Clock className="h-2.5 w-2.5" />
                {formatTimeDisplay(s.startTime)}-{formatTimeDisplay(s.endTime)}
                {s.location && <span className="opacity-70">• {s.location}</span>}
              </Badge>
            ))}
            {pendingSchedules.map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] gap-1 border border-dashed border-amber-300 dark:border-amber-700"
              >
                <Clock className="h-2.5 w-2.5" />
                {formatTimeDisplay(s.startTime)}-{formatTimeDisplay(s.endTime)}
                <span className="opacity-60">(pending)</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")}${ampm}`;
}
