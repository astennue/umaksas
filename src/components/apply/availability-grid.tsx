"use client";

import { useCallback, useMemo } from "react";
import { Check, CalendarDays, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DAYS, TIME_SLOTS, SLOTS_PER_DAY, TOTAL_SLOTS } from "@/lib/validations/application";
import { cn } from "@/lib/utils";

interface AvailabilityGridProps {
  value: boolean[];
  onChange: (value: boolean[]) => void;
}

export function AvailabilityGrid({ value, onChange }: AvailabilityGridProps) {
  const availability = useMemo(() => {
    if (!value || value.length !== TOTAL_SLOTS) {
      return Array(TOTAL_SLOTS).fill(false) as boolean[];
    }
    return value;
  }, [value]);

  const toggleSlot = useCallback(
    (dayIndex: number, timeIndex: number) => {
      const slotIndex = dayIndex * SLOTS_PER_DAY + timeIndex;
      const updated = [...availability];
      updated[slotIndex] = !updated[slotIndex];
      onChange(updated);
    },
    [availability, onChange]
  );

  const selectAllDay = useCallback(
    (dayIndex: number) => {
      const updated = [...availability];
      for (let i = 0; i < SLOTS_PER_DAY; i++) {
        updated[dayIndex * SLOTS_PER_DAY + i] = true;
      }
      onChange(updated);
    },
    [availability, onChange]
  );

  const clearAllDay = useCallback(
    (dayIndex: number) => {
      const updated = [...availability];
      for (let i = 0; i < SLOTS_PER_DAY; i++) {
        updated[dayIndex * SLOTS_PER_DAY + i] = false;
      }
      onChange(updated);
    },
    [availability, onChange]
  );

  const selectAll = useCallback(() => {
    onChange(Array(TOTAL_SLOTS).fill(true));
  }, [onChange]);

  const clearAll = useCallback(() => {
    onChange(Array(TOTAL_SLOTS).fill(false));
  }, [onChange]);

  // Count per day
  const dayCounts = useMemo(() => {
    return DAYS.map((_, dayIndex) => {
      let count = 0;
      for (let i = 0; i < SLOTS_PER_DAY; i++) {
        if (availability[dayIndex * SLOTS_PER_DAY + i]) count++;
      }
      return count;
    });
  }, [availability]);

  const totalAvailable = availability.filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3 dark:bg-muted/10">
        <div className="flex items-center gap-2">
          <Badge
            variant={totalAvailable > 0 ? "default" : "secondary"}
            className={cn(
              totalAvailable > 0 && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            {totalAvailable} of {TOTAL_SLOTS} slots selected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={selectAll}
          >
            <CheckCheck className="h-3 w-3" />
            Select All
          </Button>
          {totalAvailable > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
              onClick={clearAll}
            >
              <X className="h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-blue-600 dark:bg-blue-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border bg-background" />
          <span>Not Available</span>
        </div>
      </div>

      {/* Day counts summary */}
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day, dayIndex) => (
          <div
            key={day}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              dayCounts[dayIndex] > 0
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {day}: {dayCounts[dayIndex]} slots
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[650px] border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/50 dark:bg-muted/20">
              <th className="w-20 border-r px-2 py-2 text-left font-semibold text-muted-foreground">
                Time
              </th>
              {DAYS.map((day, dayIndex) => (
                <th key={day} className="px-1 py-2 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold text-muted-foreground">{day}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => selectAllDay(dayIndex)}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                        title={`Select all ${day}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => clearAllDay(dayIndex)}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                        title={`Clear ${day}`}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, timeIndex) => (
              <tr key={time} className="border-b last:border-b-0">
                <td className="border-r px-2 py-0.5 font-medium text-muted-foreground whitespace-nowrap">
                  {time}
                </td>
                {DAYS.map((_, dayIndex) => {
                  const slotIndex = dayIndex * SLOTS_PER_DAY + timeIndex;
                  const isAvailable = availability[slotIndex] || false;
                  return (
                    <td key={`${dayIndex}-${timeIndex}`} className="p-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSlot(dayIndex, timeIndex)}
                        className={cn(
                          "flex h-7 w-full items-center justify-center rounded transition-all",
                          isAvailable
                            ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            : "bg-background hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        )}
                        title={`${DAYS[dayIndex]} ${time} — ${isAvailable ? "Available (click to remove)" : "Click to mark available"}`}
                      >
                        {isAvailable ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Click on a time slot to toggle availability. Each slot represents a 1-hour block (e.g., 7:00 AM slot covers 7:00 AM–8:00 AM). Use &quot;All&quot; / &quot;Clear&quot; per day to quickly set your schedule.
      </p>
    </div>
  );
}
