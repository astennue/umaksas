"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
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
import {
  Calendar,
  List,
  Plus,
  Search,
  Filter,
  CalendarDays,
  Users,
  Clock,
  CheckCircle2,
  CalendarRange,
  Trash2,
} from "lucide-react";
import { EventCard, type EventData } from "@/components/events/event-card";
import { EventCalendar } from "@/components/events/event-calendar";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import { EventFormDialog } from "@/components/events/event-form-dialog";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDebounce } from "@/hooks/use-debounce";

interface Office {
  id: string;
  name: string;
}

export default function EventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventData[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  // Modals
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  const userRole = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  const canManage = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isSA = userRole === "STUDENT_ASSISTANT";

  useKeyboardShortcuts({
    "/": () => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
      input?.focus();
    },
  });

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (officeFilter !== "all") params.set("officeId", officeFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, officeFilter, debouncedSearch, page]);

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices?limit=100");
      const data = await res.json();
      if (data.offices) setOffices(data.offices);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchOffices();
  }, [fetchEvents, fetchOffices]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, officeFilter, debouncedSearch]);

  // Stats
  const stats = {
    total: events.length,
    upcoming: events.filter((e) => e.status === "UPCOMING").length,
    ongoing: events.filter((e) => e.status === "ONGOING").length,
    completed: events.filter((e) => e.status === "COMPLETED").length,
  };

  // Filtered events (client-side search already handled by API, but for calendar view)
  const calendarEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
    startDate: e.startDate,
    endDate: e.endDate,
    status: e.status,
  }));

  const handleViewEvent = (event: EventData) => {
    setDetailEventId(event.id);
    setDetailOpen(true);
  };

  const handleEditEvent = (event: EventData) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const handleCalendarDayClick = (_date: Date, dayEvents: { id: string }[]) => {
    if (dayEvents.length > 0) {
      setDetailEventId(dayEvents[0].id);
      setDetailOpen(true);
    }
  };

  // Delete handler
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${deleteEventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      toast.success("Event deleted");
      setDeleteOpen(false);
      setDeleteEventId(null);
      fetchEvents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if we need the offices API route
  const officesExist = offices.length > 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <CRUDToolbar
        title="Events"
        entityLabel="Events"
        onAdd={canManage ? handleCreateEvent : undefined}
        onSearch={setSearch}
      >
        {isSuperAdmin && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (detailEventId) {
                setDeleteEventId(detailEventId);
                setDeleteOpen(true);
              }
            }}
            disabled={!detailEventId}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        )}
      </CRUDToolbar>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Events",
            count: stats.total,
            icon: CalendarRange,
            color: "text-[#1e3a8a]",
            bg: "bg-[#1e3a8a]/10",
          },
          {
            label: "Upcoming",
            count: stats.upcoming,
            icon: CalendarDays,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "Ongoing",
            count: stats.ongoing,
            icon: Clock,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
          {
            label: "Completed",
            count: stats.completed,
            icon: CheckCircle2,
            color: "text-slate-600 dark:text-slate-400",
            bg: "bg-slate-50 dark:bg-slate-800",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-white p-3 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className={stat.bg}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search moved to CRUDToolbar */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="ONGOING">Ongoing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {officesExist && canManage && (
            <Combobox
              options={[
                { value: "all", label: "All Offices" },
                ...offices.map((office) => ({
                  value: office.id,
                  label: office.name,
                })),
              ]}
              value={officeFilter}
              onChange={setOfficeFilter}
              placeholder="Filter by office..."
              className="w-[180px]"
            />
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="mr-1 h-4 w-4" />
            List
          </Button>
          <Button
            variant={view === "calendar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("calendar")}
          >
            <Calendar className="mr-1 h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {(statusFilter !== "all" || officeFilter !== "all" || search) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {statusFilter !== "all" && (
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => setStatusFilter("all")}
            >
              {statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} ✕
            </Badge>
          )}
          {officeFilter !== "all" && (
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => setOfficeFilter("all")}
            >
              {offices.find((o) => o.id === officeFilter)?.name || "Office"} ✕
            </Badge>
          )}
          {search && (
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => setSearch("")}
            >
              &quot;{search}&quot; ✕
            </Badge>
          )}
        </div>
      )}

      {/* Content */}
      {view === "calendar" ? (
        <EventCalendar
          events={calendarEvents}
          onDayClick={handleCalendarDayClick}
        />
      ) : (
        <div className="space-y-4">
          {events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No events found"
              description={
                search || statusFilter !== "all" || officeFilter !== "all"
                  ? "Try adjusting your filters"
                  : canManage
                    ? "Create your first event to get started"
                    : "You have no assigned events yet"
              }
              action={
                canManage &&
                !search &&
                statusFilter === "all" &&
                officeFilter === "all"
                  ? { label: "Create Event", onClick: handleCreateEvent }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onView={handleViewEvent}
                    onEdit={canManage ? handleEditEvent : undefined}
                    canEdit={canManage}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - page) <= 1
                      )
                      .map((p, idx, arr) => (
                        <span key={p} className="flex items-center gap-1">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-xs text-muted-foreground px-1">
                              ...
                            </span>
                          )}
                          <Button
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            className={
                              p === page
                                ? "h-8 w-8 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                                : "h-8 w-8"
                            }
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        </span>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        eventId={detailEventId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canManage={canManage}
        isSA={isSA}
        onUpdated={fetchEvents}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Event Dialog */}
      <EventFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEvent(null);
        }}
        event={editingEvent}
        onSaved={fetchEvents}
      />
    </div>
  );
}
