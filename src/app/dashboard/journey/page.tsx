"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { RoleGuard } from "@/components/auth/role-guard";

// ============================================
// Types
// ============================================

interface JourneyEventItem {
  id?: string;
  year: string;
  title: string;
  description: string;
  orderIndex: number;
  isActive: boolean;
}

// ============================================
// Loading Skeleton
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4">
          <History className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          No journey events yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          Add milestone events to display on the public About page timeline.
        </p>
        <Button
          onClick={onAdd}
          className="mt-4 gap-2 bg-[#003366] hover:bg-[#003366]/90 text-white"
        >
          <Plus className="h-4 w-4" />
          Add First Event
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Event Edit Card
// ============================================

function EventEditCard({
  event,
  index,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  event: JourneyEventItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (index: number, field: keyof JourneyEventItem, value: string | boolean) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div
          className={cn(
            "w-1.5 shrink-0",
            index % 2 === 0
              ? "bg-gradient-to-b from-[#003366] to-[#1e40af]"
              : "bg-gradient-to-b from-amber-500 to-yellow-500"
          )}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-xs shrink-0"
                >
                  #{index + 1}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {event.year || "No year set"}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMoveUp(index)}
                  disabled={isFirst}
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMoveDown(index)}
                  disabled={isLast}
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(index)}
                  title="Delete event"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`year-${index}`} className="text-xs font-medium">
                  Year
                </Label>
                <Input
                  id={`year-${index}`}
                  value={event.year}
                  onChange={(e) => onUpdate(index, "year", e.target.value)}
                  placeholder="e.g., 2025"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`title-${index}`} className="text-xs font-medium">
                  Title
                </Label>
                <Input
                  id={`title-${index}`}
                  value={event.title}
                  onChange={(e) => onUpdate(index, "title", e.target.value)}
                  placeholder="e.g., Program Inception"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor={`desc-${index}`}
                className="text-xs font-medium"
              >
                Description
              </Label>
              <Textarea
                id={`desc-${index}`}
                value={event.description}
                onChange={(e) => onUpdate(index, "description", e.target.value)}
                placeholder="Describe this milestone..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Timeline Preview
// ============================================

function TimelinePreview({ events }: { events: JourneyEventItem[] }) {
  if (events.length === 0) return null;

  return (
    <Card className="overflow-hidden border-amber-200 dark:border-amber-800/50">
      <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
      <CardHeader>
        <CardTitle className="text-base">Timeline Preview</CardTitle>
        <CardDescription>
          This is how the timeline will appear on the public About page
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="relative">
          {/* Central vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-amber-500/40 md:left-1/2 md:-translate-x-px" />

          {events.map((event, i) => (
            <div key={i} className="relative mb-6 last:mb-0">
              {/* Timeline node */}
              <div className="absolute left-[13px] top-5 z-10 h-3 w-3 rounded-full bg-amber-400 ring-4 ring-white dark:ring-slate-950 shadow-[0_0_10px_rgba(234,179,8,0.4)] md:left-1/2 md:-translate-x-1/2 md:top-6" />

              {/* Card — alternating on desktop */}
              <div
                className={
                  i % 2 === 0
                    ? "pl-10 md:w-[calc(50%-1.5rem)] md:pr-0"
                    : "pl-10 md:ml-auto md:w-[calc(50%-1.5rem)] md:pl-0"
                }
              >
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 sm:p-4">
                  <Badge
                    variant="secondary"
                    className="mb-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] sm:text-xs"
                  >
                    {event.year || "—"}
                  </Badge>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {event.title || "Untitled Event"}
                  </h4>
                  {event.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Page Component
// ============================================

function JourneyCMS() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Data state
  const [events, setEvents] = useState<JourneyEventItem[]>([]);
  const [originalEvents, setOriginalEvents] = useState<JourneyEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default events for initial population
  const defaultEvents: JourneyEventItem[] = [
    {
      year: "2002",
      title: "Program Inception",
      description:
        "The University of Makati established the Student Assistant Program to support underprivileged but deserving students with work opportunities within the university.",
      orderIndex: 0,
      isActive: true,
    },
    {
      year: "2008",
      title: "Campus-Wide Expansion",
      description:
        "The program expanded to deploy student assistants across all university colleges and administrative offices.",
      orderIndex: 1,
      isActive: true,
    },
    {
      year: "2014",
      title: "Policy Reforms",
      description:
        "Comprehensive policies and guidelines were formalized, including attendance tracking, evaluation criteria, and benefit structures.",
      orderIndex: 2,
      isActive: true,
    },
    {
      year: "2018",
      title: "Digital Transition",
      description:
        "The system transitioned from manual record-keeping to digital processes, improving efficiency and accountability.",
      orderIndex: 3,
      isActive: true,
    },
    {
      year: "2022",
      title: "Unified Management",
      description:
        "A unified management approach was adopted, standardizing operations across all offices and departments.",
      orderIndex: 4,
      isActive: true,
    },
    {
      year: "2025",
      title: "Full System Launch",
      description:
        "The comprehensive UMak SAS digital platform launched with real-time attendance, schedule management, evaluations, and analytics.",
      orderIndex: 5,
      isActive: true,
    },
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/journey-events");
      if (!res.ok) throw new Error("Failed to fetch journey events");
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const mapped: JourneyEventItem[] = data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          year: (e.year as string) || "",
          title: (e.title as string) || "",
          description: (e.description as string) || "",
          orderIndex: (e.orderIndex as number) || 0,
          isActive: (e.isActive as boolean) ?? true,
        }));
        setEvents(mapped);
        setOriginalEvents(mapped);
      } else {
        // No events yet — use defaults as initial state
        setEvents(defaultEvents.map((e) => ({ ...e })));
        setOriginalEvents([]);
      }
    } catch {
      toast.error("Failed to load journey events");
      // Fallback to defaults
      setEvents(defaultEvents.map((e) => ({ ...e })));
      setOriginalEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for unsaved changes
  const hasChanges = (() => {
    if (originalEvents.length === 0 && events.length === 0) return false;
    // If originalEvents was empty (first load with no data), compare against defaults
    if (originalEvents.length === 0 && events.length > 0) {
      const isAllDefaults =
        events.length === defaultEvents.length &&
        events.every((e, i) => e.year === defaultEvents[i]?.year && e.title === defaultEvents[i]?.title && e.description === defaultEvents[i]?.description);
      if (isAllDefaults) return false;
      return true;
    }
    if (originalEvents.length !== events.length) return true;
    return events.some(
      (e, i) =>
        e.year !== originalEvents[i]?.year ||
        e.title !== originalEvents[i]?.title ||
        e.description !== originalEvents[i]?.description ||
        e.orderIndex !== originalEvents[i]?.orderIndex ||
        e.isActive !== originalEvents[i]?.isActive
    );
  })();

  // Handlers
  const handleUpdateEvent = (
    index: number,
    field: keyof JourneyEventItem,
    value: string | boolean
  ) => {
    setEvents((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const handleAddEvent = () => {
    const newEvent: JourneyEventItem = {
      year: new Date().getFullYear().toString(),
      title: "",
      description: "",
      orderIndex: events.length,
      isActive: true,
    };
    setEvents((prev) => [...prev, newEvent]);
    toast.success("New event added");
  };

  const handleDeleteEvent = async (index: number) => {
    const event = events[index];
    const eventName = event.title || event.year || `Event #${index + 1}`;

    const confirmed = await confirm({
      title: "Delete Event",
      description: `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    setEvents((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((e, i) => ({ ...e, orderIndex: i }))
    );
    toast.success("Event deleted");
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setEvents((prev) => {
      const updated = prev.map((e, i) => {
        if (i === index - 1) return { ...e, orderIndex: i + 1 };
        if (i === index) return { ...e, orderIndex: i - 1 };
        return e;
      });
      // Swap positions
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated.map((e, i) => ({ ...e, orderIndex: i }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === events.length - 1) return;
    setEvents((prev) => {
      const updated = prev.map((e, i) => {
        if (i === index + 1) return { ...e, orderIndex: i - 1 };
        if (i === index) return { ...e, orderIndex: i + 1 };
        return e;
      });
      // Swap positions
      [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
      return updated.map((e, i) => ({ ...e, orderIndex: i }));
    });
  };

  // Save handler
  const handleSave = async () => {
    // Validate events
    const invalidEvent = events.find(
      (e) => !e.year.trim() || !e.title.trim()
    );
    if (invalidEvent) {
      toast.error("Each event must have a year and title");
      return;
    }

    const eventCount = events.length;
    const confirmed = await confirm({
      title: "Save Journey Events",
      description: `Are you sure you want to save ${eventCount} journey event${eventCount !== 1 ? "s" : ""}? This will replace all existing events on the public About page.`,
      confirmText: "Save Changes",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch("/api/journey-events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: events.map((e, i) => ({
            year: e.year.trim(),
            title: e.title.trim(),
            description: e.description.trim() || null,
            orderIndex: i,
            isActive: true,
          })),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save");
      }

      const result = await res.json();
      const savedEvents = (result.events || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        year: (e.year as string) || "",
        title: (e.title as string) || "",
        description: (e.description as string) || "",
        orderIndex: (e.orderIndex as number) || 0,
        isActive: (e.isActive as boolean) ?? true,
      }));

      setEvents(savedEvents);
      setOriginalEvents(savedEvents);
      toast.success("Journey events updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <History className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Our Journey</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage the timeline milestones displayed on the public About page
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAddEvent}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-[#003366] hover:bg-[#003366]/90 text-white min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You have unsaved changes
          </p>
        </div>
      )}

      {/* Event count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Events are displayed in chronological order on the About page
        </span>
      </div>

      {/* Events list or empty state */}
      {events.length === 0 ? (
        <EmptyState onAdd={handleAddEvent} />
      ) : (
        <div className="space-y-4">
          {/* Editable event cards */}
          {events.map((event, index) => (
            <EventEditCard
              key={index}
              event={event}
              index={index}
              isFirst={index === 0}
              isLast={index === events.length - 1}
              onUpdate={handleUpdateEvent}
              onDelete={handleDeleteEvent}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
      )}

      {/* Timeline Preview */}
      {events.length > 0 && <TimelinePreview events={events} />}
    </div>
  );
}

// ============================================
// Page Export with RoleGuard
// ============================================

export default function JourneyPage() {
  return (
    <RoleGuard
      allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}
      presidentOnly
    >
      <JourneyCMS />
    </RoleGuard>
  );
}
