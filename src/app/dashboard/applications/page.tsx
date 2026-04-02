"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Mail,
  GraduationCap,
  Clock,
  Star,
  ArrowRight,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";

interface Application {
  id: string;
  applicantEmail: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  college: string | null;
  program: string | null;
  status: string;
  interviewStatus: string;
  interviewScore: number | null;
  interviewDate: string | null;
  totalScore: number | null;
  rank: number | null;
  currentStep: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  INTERVIEWED: { label: "Interviewed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  WITHDRAWN: { label: "Withdrawn", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500" },
};

export default function ApplicationsPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scheduleApp, setScheduleApp] = useState<{ id: string; name: string } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const limit = 12;

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/applications/admin?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSchedule = (app: Application) => {
    const name = `${app.firstName || ""} ${app.lastName || ""}`.trim() || app.applicantEmail;
    setScheduleApp({ id: app.id, name });
    setScheduleOpen(true);
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appId,
          status: newStatus,
          reviewedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        // Since the API only allows updating DRAFT, we need a different approach
        // For now, show a toast
        toast.info("Status update requires a dedicated admin API endpoint");
        return;
      }

      toast.success("Application status updated");
      fetchApplications();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const userRole = (session?.user as { role?: string })?.role;
  const canManage = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Applications</h1>
        <p className="text-sm text-muted-foreground">
          Review and manage student assistant applications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", count: total, color: "text-slate-900 dark:text-white" },
          { label: "Submitted", count: applications.filter((a) => a.status === "SUBMITTED").length, color: "text-blue-600" },
          { label: "Under Review", count: applications.filter((a) => a.status === "UNDER_REVIEW").length, color: "text-violet-600" },
          { label: "Interviewed", count: applications.filter((a) => a.status === "INTERVIEWED").length, color: "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-3 dark:bg-slate-800">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="INTERVIEW_SCHEDULED">Interview Scheduled</SelectItem>
              <SelectItem value="INTERVIEWED">Interviewed</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Application Cards */}
      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-sm font-medium text-muted-foreground">No applications found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {search || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Applications will appear here when submitted"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Applicant</th>
                  <th className="pb-3 pr-4 font-medium">College</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Interview</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.map((app) => {
                  const name = `${app.firstName || ""} ${app.lastName || ""}`.trim() || app.applicantEmail;
                  const config = statusConfig[app.status] || statusConfig.DRAFT;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 pr-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{app.applicantEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm truncate max-w-[150px]">{app.college || "—"}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={config.color} variant="secondary">{config.label}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{app.interviewStatus.replace(/_/g, " ")}</span>
                          {app.interviewScore !== null && (
                            <span className="text-xs font-medium text-amber-600">{app.interviewScore}/100</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-muted-foreground">
                          {app.submittedAt ? format(new Date(app.submittedAt), "MMM d, yyyy") : "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedApp(app); setDetailOpen(true); }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {canManage && !["APPROVED", "REJECTED", "WITHDRAWN"].includes(app.status) && (
                            <Button
                              size="sm"
                              className="h-7 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-xs"
                              onClick={() => handleSchedule(app)}
                            >
                              <ArrowRight className="mr-1 h-3 w-3" />
                              Interview
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {applications.map((app) => {
              const name = `${app.firstName || ""} ${app.lastName || ""}`.trim() || app.applicantEmail;
              const config = statusConfig[app.status] || statusConfig.DRAFT;

              return (
                <Card key={app.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold truncate">{name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{app.applicantEmail}</p>
                        {app.college && (
                          <p className="text-xs text-muted-foreground mt-0.5">{app.college}</p>
                        )}
                      </div>
                      <Badge className={config.color} variant="secondary">{config.label}</Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      {app.interviewStatus && (
                        <span>Interview: {app.interviewStatus.replace(/_/g, " ")}</span>
                      )}
                      {app.interviewScore !== null && (
                        <span className="font-medium text-amber-600">Score: {app.interviewScore}/100</span>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => { setSelectedApp(app); setDetailOpen(true); }}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      {canManage && !["APPROVED", "REJECTED", "WITHDRAWN"].includes(app.status) && (
                        <Button
                          size="sm"
                          className="flex-1 h-8 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-xs"
                          onClick={() => handleSchedule(app)}
                        >
                          <ArrowRight className="mr-1 h-3 w-3" />
                          Proceed to Interview
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Application Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold break-words">
                      {`${selectedApp.firstName || ""} ${selectedApp.lastName || ""}`.trim() || selectedApp.applicantEmail}
                    </h3>
                    <p className="text-sm text-muted-foreground break-words">{selectedApp.applicantEmail}</p>
                  </div>
                  <Badge className={statusConfig[selectedApp.status]?.color || ""} variant="secondary">
                    {statusConfig[selectedApp.status]?.label || selectedApp.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedApp.college || "No college specified"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedApp.program || "No program specified"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Submitted: {selectedApp.submittedAt
                      ? format(new Date(selectedApp.submittedAt), "MMM d, yyyy 'at' h:mm a")
                      : "Not submitted yet"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Interview: {selectedApp.interviewStatus.replace(/_/g, " ")}
                    {selectedApp.interviewDate && ` — ${format(new Date(selectedApp.interviewDate), "MMM d, yyyy 'at' h:mm a")}`}
                  </span>
                </div>
                {selectedApp.interviewScore !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Interview Score: {selectedApp.interviewScore}/100</span>
                  </div>
                )}
                {selectedApp.totalScore !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Total Score: {selectedApp.totalScore}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t pt-4">
                {canManage && !["APPROVED", "REJECTED", "WITHDRAWN"].includes(selectedApp.status) && (
                  <Button
                    className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                    onClick={() => {
                      setDetailOpen(false);
                      handleSchedule(selectedApp);
                    }}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Proceed to Interview
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      {scheduleApp && (
        <ScheduleInterviewDialog
          applicationId={scheduleApp.id}
          applicantName={scheduleApp.name}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onScheduled={fetchApplications}
        />
      )}
    </div>
  );
}
