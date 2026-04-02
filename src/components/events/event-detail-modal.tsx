"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  MapPin,
  Users,
  Building2,
  Clock,
  Check,
  X as XIcon,
  UserMinus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface Assignment {
  id: string;
  userId: string;
  eventId: string;
  role: string | null;
  assignedAt: string;
  assignedBy: string | null;
  status: string;
  confirmedAt: string | null;
  attended: boolean | null;
  hoursRendered: number | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    profile: {
      college: string | null;
      program: string | null;
      office: { id: string; name: string } | null;
    } | null;
  };
  assignedByUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface EventDetail {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  requiredSACount: number | null;
  reportGenerated: boolean;
  reportUrl: string | null;
  office: { id: string; name: string; code: string | null } | null;
  assignments: Assignment[];
}

interface EventDetailModalProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
  isSA?: boolean;
  onUpdated?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  UPCOMING: {
    label: "Upcoming",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ONGOING: {
    label: "Ongoing",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const assignmentStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  ASSIGNED: {
    label: "Assigned",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle2,
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  ABSENT: {
    label: "Absent",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertCircle,
  },
};

export function EventDetailModal({
  eventId,
  open,
  onOpenChange,
  canManage = false,
  isSA = false,
  onUpdated,
}: EventDetailModalProps) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [hoursInput, setHoursInput] = useState<Record<string, string>>({});
  const [saSearch, setSaSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [saResults, setSaResults] = useState<
    { id: string; firstName: string | null; lastName: string | null; email: string; college: string | null }[]
  >([]);
  const [saSearchOpen, setSaSearchOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error("Failed to fetch event");
      const data = await res.json();
      setEvent(data.event);
    } catch (error) {
      toast.error("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && eventId) {
      fetchEvent();
    }
  }, [open, eventId]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) setCurrentUserId(userId);
  }, []);

  const handleSAAction = async (assignmentId: string, action: string) => {
    setStatusLoading(assignmentId);
    try {
      const res = await fetch(`/api/events/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(
        action === "confirm"
          ? "Assignment confirmed"
          : action === "decline"
            ? "Assignment declined"
            : action === "mark_present"
              ? "Marked as present"
              : action === "mark_absent"
                ? "Marked as absent"
                : "Action completed"
      );
      fetchEvent();
      onUpdated?.();
    } catch {
      toast.error("Failed to perform action");
    } finally {
      setStatusLoading(null);
    }
  };

  const handleUpdateHours = async (assignmentId: string) => {
    const hours = hoursInput[assignmentId];
    if (!hours || isNaN(parseFloat(hours))) {
      toast.error("Please enter valid hours");
      return;
    }
    setStatusLoading(assignmentId);
    try {
      const res = await fetch(`/api/events/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_hours", hoursRendered: hours }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Hours updated");
      setHoursInput((prev) => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
      fetchEvent();
    } catch {
      toast.error("Failed to update hours");
    } finally {
      setStatusLoading(null);
    }
  };

  const handleAssignSA = async (userId: string) => {
    if (!eventId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/events/${eventId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId], role: "Student Assistant" }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      toast.success("SA assigned to event");
      setSaSearch("");
      setSaSearchOpen(false);
      fetchEvent();
      onUpdated?.();
    } catch {
      toast.error("Failed to assign SA");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveSA = async (assignmentId: string) => {
    if (!confirm("Remove this assignment?")) return;
    setStatusLoading(assignmentId);
    try {
      const res = await fetch(`/api/events/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Assignment removed");
      fetchEvent();
      onUpdated?.();
    } catch {
      toast.error("Failed to remove assignment");
    } finally {
      setStatusLoading(null);
    }
  };

  const searchSAs = async (query: string) => {
    if (query.length < 2 || !eventId) {
      setSaResults([]);
      return;
    }
    try {
      // Fetch SAs not already assigned
      const assignedIds = event?.assignments.map((a) => a.userId) || [];
      const res = await fetch(
        `/api/student-assistants?search=${encodeURIComponent(query)}&status=ACTIVE&limit=10`
      );
      const data = await res.json();
      if (data.assistants) {
        setSaResults(
          data.assistants.filter(
            (sa: { id: string }) => !assignedIds.includes(sa.id)
          )
        );
      }
    } catch {
      setSaResults([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (saSearch.length >= 2) searchSAs(saSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [saSearch, searchSAs]);

  if (!event && !loading) return null;

  const config = statusConfig[event?.status || "UPCOMING"];
  const start = event ? parseISO(event.startDate) : new Date();
  const end = event?.endDate ? parseISO(event.endDate) : null;
  const assignedCount = event?.assignments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "ASSIGNED"
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Event Details
            </DialogTitle>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a8a] border-t-transparent" />
          </div>
        ) : event ? (
          <ScrollArea className="max-h-[75vh] px-6 pb-6">
            <div className="space-y-6">
              {/* Event Info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {event.name}
                  </h2>
                  <Badge className={config.color} variant="secondary">
                    {config.label}
                  </Badge>
                </div>
              </div>

              {event.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>
                    {format(start, "MMM d, yyyy")}
                    {end ? ` - ${format(end, "MMM d, yyyy")}` : ""}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.office && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{event.office.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>
                    {assignedCount}
                    {event.requiredSACount
                      ? ` / ${event.requiredSACount}`
                      : ""}{" "}
                    SAs
                  </span>
                </div>
              </div>

              <Separator />

              {/* Assignments Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Assigned Student Assistants ({event.assignments.length})
                </h3>

                {/* SA Assign Search (admin) */}
                {canManage && event.status !== "CANCELLED" && (
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={saSearch}
                        onChange={(e) => {
                          setSaSearch(e.target.value);
                          setSaSearchOpen(true);
                        }}
                        onFocus={() => setSaSearchOpen(true)}
                        placeholder="Search and add SAs..."
                        className="pl-9"
                      />
                    </div>
                    {saSearchOpen && saResults.length > 0 && (
                      <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-900">
                        {saResults.map((sa) => (
                          <button
                            key={sa.id}
                            onClick={() => handleAssignSA(sa.id)}
                            disabled={assigning}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white truncate">
                                {sa.firstName} {sa.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {sa.college || sa.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {event.assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                    No student assistants assigned yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {event.assignments.map((assignment) => {
                      const aConfig =
                        assignmentStatusConfig[assignment.status] ||
                        assignmentStatusConfig.ASSIGNED;
                      const SAIcon = aConfig.icon;
                      const userName = `${assignment.user.firstName || ""} ${assignment.user.lastName || ""}`.trim() || assignment.user.email;

                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-medium">
                              {assignment.user.firstName?.[0] || ""}
                              {assignment.user.lastName?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {userName}
                              </p>
                              <Badge
                                className={aConfig.color}
                                variant="secondary"
                              >
                                <SAIcon className="h-3 w-3 mr-1" />
                                {aConfig.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {assignment.user.profile?.college && (
                                <span>{assignment.user.profile.college}</span>
                              )}
                              {assignment.hoursRendered !== null &&
                                assignment.hoursRendered > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {assignment.hoursRendered}h rendered
                                  </span>
                                )}
                              {assignment.attended === true && (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Present
                                </span>
                              )}
                            </div>
                          </div>

                          {/* SA Actions */}
                          {isSA &&
                            assignment.userId === currentUserId &&
                            assignment.status === "ASSIGNED" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() =>
                                    handleSAAction(assignment.id, "confirm")
                                  }
                                  disabled={statusLoading === assignment.id}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() =>
                                    handleSAAction(assignment.id, "decline")
                                  }
                                  disabled={statusLoading === assignment.id}
                                >
                                  <XIcon className="h-3 w-3 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            )}

                          {/* Admin Actions */}
                          {canManage && (
                            <div className="flex items-center gap-1 shrink-0">
                              {assignment.status === "CONFIRMED" &&
                                assignment.attended === null && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() =>
                                        handleSAAction(
                                          assignment.id,
                                          "mark_present"
                                        )
                                      }
                                      disabled={
                                        statusLoading === assignment.id
                                      }
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Present
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        handleSAAction(
                                          assignment.id,
                                          "mark_absent"
                                        )
                                      }
                                      disabled={
                                        statusLoading === assignment.id
                                      }
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Absent
                                    </Button>
                                  </>
                                )}
                              {assignment.attended !== null &&
                                assignment.attended !== false && (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      value={
                                        hoursInput[assignment.id] ||
                                        assignment.hoursRendered?.toString() ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setHoursInput((prev) => ({
                                          ...prev,
                                          [assignment.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Hours"
                                      className="h-7 w-16 text-xs"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() =>
                                        handleUpdateHours(assignment.id)
                                      }
                                      disabled={
                                        statusLoading === assignment.id
                                      }
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  handleRemoveSA(assignment.id)
                                }
                                disabled={statusLoading === assignment.id}
                              >
                                <UserMinus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
