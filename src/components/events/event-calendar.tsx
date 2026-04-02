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
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

interface EventCalendarProps {
  events: CalendarEvent[];
  onDayClick?: (date: Date, events: CalendarEvent[]) => void;
}

const statusDotColors: Record<string, string> = {
  UPCOMING: "bg-blue-500",
  ONGOING: "bg-green-500",
  COMPLETED: "bg-slate-400",
  CANCELLED: "bg-red-500",
};

export function EventCalendar({ events, onDayClick }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : start;

      let day = start;
      while (day <= end) {
        const dateKey = format(day, "yyyy-MM-dd");
        const existing = map.get(dateKey) || [];
        existing.push(event);
        map.set(dateKey, existing);
        day = addDays(day, 1);
      }
    });
    return map;
  }, [events]);

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
    <div className="rounded-lg border bg-white p-4 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
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
          <div
            key={d}
            className="py-1 text-center text-[10px] font-medium text-muted-foreground uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((d, i) => {
          const dateKey = format(d, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const inMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);

          return (
            <button
              key={i}
              onClick={() =>
                dayEvents.length > 0 && onDayClick?.(d, dayEvents)
              }
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-md py-1.5 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[3rem]",
                !inMonth && "text-muted-foreground/40",
                today &&
                  "bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-700 dark:text-blue-400",
                dayEvents.length > 0 && "cursor-pointer"
              )}
            >
              <span className="text-xs">{format(d, "d")}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event, j) => (
                    <div
                      key={j}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        statusDotColors[event.status] || "bg-slate-400"
                      )}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-muted-foreground leading-none">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-200 dark:border-slate-700 pt-3">
        {[
          { label: "Upcoming", color: "bg-blue-500" },
          { label: "Ongoing", color: "bg-green-500" },
          { label: "Completed", color: "bg-slate-400" },
          { label: "Cancelled", color: "bg-red-500" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full", color)} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
