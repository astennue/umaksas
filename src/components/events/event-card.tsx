"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  MapPin,
  Users,
  Eye,
  Pencil,
  Building2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export interface EventData {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  requiredSACount: number | null;
  officeId: string | null;
  office: { id: string; name: string; code: string | null } | null;
  _count: { assignments: number };
  confirmedCount: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  UPCOMING: {
    label: "Upcoming",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ONGOING: {
    label: "Ongoing",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  COMPLETED: {
    label: "Completed",
    color:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

interface EventCardProps {
  event: EventData;
  onView?: (event: EventData) => void;
  onEdit?: (event: EventData) => void;
  canEdit?: boolean;
  compact?: boolean;
}

export function EventCard({
  event,
  onView,
  onEdit,
  canEdit = false,
  compact = false,
}: EventCardProps) {
  const config = statusConfig[event.status] || statusConfig.UPCOMING;
  const start = parseISO(event.startDate);
  const end = event.endDate ? parseISO(event.endDate) : null;

  const dateRange =
    end && !compact
      ? `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
      : format(start, "MMM d, yyyy");

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {event.name}
            </h3>
            {event.description && !compact && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
          <Badge className={config.color} variant="secondary">
            {config.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{dateRange}</span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.office && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {event.office.name}
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {event.confirmedCount || 0}
              {event.requiredSACount
                ? ` / ${event.requiredSACount}`
                : ""}{" "}
              SA{event.confirmedCount !== 1 ? "s" : ""} assigned
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => onView?.(event)}
          >
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
          {canEdit && event.status !== "CANCELLED" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => onEdit?.(event)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
