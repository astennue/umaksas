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
import {
  Calendar,
  List,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { InterviewCard, type InterviewData } from "@/components/interviews/interview-card";
import { InterviewCalendar } from "@/components/interviews/interview-calendar";
import { InterviewDetailModal } from "@/components/interviews/interview-detail-modal";
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";
import { toast } from "sonner";

interface ApplicationItem {
  id: string;
  applicantEmail: string;
  firstName: string | null;
  lastName: string | null;
  college: string | null;
  status: string;
  interviewStatus: string;
}

export default function InterviewsPage() {
  const { data: session } = useSession();
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedInterview, setSelectedInterview] = useState<InterviewData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<{ id: string; name: string } | null>(null);

  const fetchInterviews = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/interviews?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch interviews");
      const data = await res.json();
      setInterviews(data.interviews || []);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      toast.error("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/applications/admin?limit=100");
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
    fetchApplications();
  }, [fetchInterviews, fetchApplications]);

  const handleInterviewClick = (interview: InterviewData) => {
    setSelectedInterview(interview);
    setDetailOpen(true);
  };

  const handleScheduleFromApp = (appId: string, name: string) => {
    setSelectedApplication({ id: appId, name });
    setScheduleOpen(true);
  };

  // Calendar data
  const calendarInterviews = interviews.map((i) => ({
    id: i.id,
    scheduledAt: i.scheduledAt,
    applicantName: i.application.firstName
      ? `${i.application.firstName} ${i.application.lastName || ""}`.trim()
      : i.application.applicantEmail,
    status: i.status,
  }));

  // Filter interviews for list view
  const filteredInterviews = interviews.filter((interview) => {
    const name = interview.application.firstName
      ? `${interview.application.firstName} ${interview.application.lastName || ""}`.toLowerCase()
      : interview.application.applicantEmail.toLowerCase();

    if (search && !name.includes(search.toLowerCase())) return false;
    return true;
  });

  // Applications that can be scheduled for interview
  const schedulableApplications = applications.filter(
    (app) => ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_SCHEDULED", "INTERVIEWED"].includes(app.status)
  );

  const userRole = (session?.user as { role?: string })?.role;
  const canManage = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Interviews
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage interview schedules and results
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              if (schedulableApplications.length > 0) {
                const app = schedulableApplications[0];
                handleScheduleFromApp(
                  app.id,
                  `${app.firstName || ""} ${app.lastName || ""}`.trim() || app.applicantEmail
                );
              } else {
                toast.info("No applications available to schedule interviews for");
              }
            }}
            className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Schedule Interview
          </Button>
        )}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by applicant name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="DECLINED">Declined</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="RESCHEDULE_REQUESTED">Reschedule Requested</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Scheduled", count: interviews.filter((i) => i.status === "SCHEDULED").length, color: "text-blue-600" },
          { label: "Completed", count: interviews.filter((i) => i.status === "COMPLETED").length, color: "text-amber-600" },
          { label: "Pending", count: interviews.filter((i) => ["SCHEDULED", "ACCEPTED", "RESCHEDULE_REQUESTED"].includes(i.status)).length, color: "text-orange-600" },
          { label: "Total", count: interviews.length, color: "text-slate-900 dark:text-white" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-3 dark:bg-slate-800">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {view === "calendar" ? (
        <InterviewCalendar
          interviews={calendarInterviews}
          onDayClick={(_date, dayInterviews) => {
            const first = dayInterviews[0];
            const fullInterview = interviews.find((i) => i.id === first.id);
            if (fullInterview) {
              setSelectedInterview(fullInterview);
              setDetailOpen(true);
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredInterviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-sm font-medium text-muted-foreground">No interviews found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Schedule your first interview to get started"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredInterviews.map((interview) => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  onClick={handleInterviewClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interview Detail Modal */}
      <InterviewDetailModal
        interview={selectedInterview}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={fetchInterviews}
      />

      {/* Schedule Interview Dialog */}
      {selectedApplication && (
        <ScheduleInterviewDialog
          applicationId={selectedApplication.id}
          applicantName={selectedApplication.name}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onScheduled={fetchInterviews}
        />
      )}
    </div>
  );
}
