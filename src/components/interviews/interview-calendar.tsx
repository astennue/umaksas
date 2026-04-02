"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface CalendarInterview {
  id: string;
  scheduledAt: string;
  applicantName: string;
  status: string;
}

interface InterviewCalendarProps {
  interviews: CalendarInterview[];
  onDayClick?: (date: Date, interviews: CalendarInterview[]) => void;
}

const statusDotColors: Record<string, string> = {
  SCHEDULED: "bg-blue-500",
  ACCEPTED: "bg-green-500",
  DECLINED: "bg-red-500",
  COMPLETED: "bg-amber-500",
  RESCHEDULE_REQUESTED: "bg-orange-500",
  CANCELLED: "bg-slate-400",
  NO_SHOW: "bg-red-600",
};

export function InterviewCalendar({ interviews, onDayClick }: InterviewCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group interviews by date
  const interviewsByDate = useMemo(() => {
    const map = new Map<string, CalendarInterview[]>();
    interviews.forEach((interview) => {
      const dateKey = format(new Date(interview.scheduledAt), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      existing.push(interview);
      map.set(dateKey, existing);
    });
    return map;
  }, [interviews]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-muted-foreground uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((d, i) => {
          const dateKey = format(d, "yyyy-MM-dd");
          const dayInterviews = interviewsByDate.get(dateKey) || [];
          const inMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);

          return (
            <button
              key={i}
              onClick={() => dayInterviews.length > 0 && onDayClick?.(d, dayInterviews)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-md py-1.5 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                !inMonth && "text-muted-foreground/40",
                today && "bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-700 dark:text-blue-400",
                dayInterviews.length > 0 && "cursor-pointer"
              )}
            >
              <span className="text-xs">{format(d, "d")}</span>
              {dayInterviews.length > 0 && (
                <div className="flex gap-0.5">
                  {dayInterviews.slice(0, 3).map((interview, j) => (
                    <div
                      key={j}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        statusDotColors[interview.status] || "bg-slate-400"
                      )}
                    />
                  ))}
                  {dayInterviews.length > 3 && (
                    <span className="text-[8px] text-muted-foreground leading-none">
                      +{dayInterviews.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 border-t pt-3">
        {Object.entries(statusDotColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full", color)} />
            <span className="text-[10px] text-muted-foreground capitalize">
              {status.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
