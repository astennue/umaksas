"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CheckCircle2,
  XCircle,
  Download,
  ImageIcon,
  IdCard,
  BookOpen,
  ClipboardList,
  Loader2,
  Users,
  Phone,
  MapPin,
  Building,
  Baby,
  Heart,
  School,
  Briefcase,
  Award,
  UserCheck,
  Pencil,
  CalendarClock,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { safeJsonParse } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";

interface Application {
  id: string;
  applicantEmail: string;
  userId: string | null;
  status: string;
  currentStep: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Personal Information
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  gender: string | null;
  civilStatus: string | null;
  religion: string | null;
  citizenship: string | null;
  // Contact Information
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  // Residence
  residenceAddress: string | null;
  residenceCity: string | null;
  residenceZip: string | null;
  // Family Background
  fatherName: string | null;
  fatherOccupation: string | null;
  fatherContact: string | null;
  motherName: string | null;
  motherMaidenName: string | null;
  motherOccupation: string | null;
  motherContact: string | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianContact: string | null;
  siblingsCount: number | null;
  // Educational Background
  elementarySchool: string | null;
  elementaryYear: string | null;
  highSchool: string | null;
  highSchoolYear: string | null;
  seniorHigh: string | null;
  seniorHighYear: string | null;
  seniorHighTrack: string | null;
  // Current Education
  studentNumber: string | null;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  section: string | null;
  gwa: string | null;
  // Employment & Skills
  employmentJson: string | null;
  // Availability
  availabilityJson: string | null;
  // Trainings
  trainingsJson: string | null;
  // References
  referencesJson: string | null;
  // Essays
  essayWhyApply: string | null;
  essayGoals: string | null;
  essaySkills: string | null;
  essayChallenges: string | null;
  // Upload fields
  photoUrl: string | null;
  resumeUrl: string | null;
  gradeReportUrl: string | null;
  registrationUrl: string | null;
  residenceImageUrl: string | null;
  // Review
  interviewStatus: string | null;
  interviewScore: number | null;
  interviewDate: string | null;
  interviewNotes: string | null;
  totalScore: number | null;
  rank: number | null;
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

function FieldDisplay({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}

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

  // Approve/Reject state
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);

  const { confirm, ConfirmDialog } = useConfirm();

  useKeyboardShortcuts({
    "/": () => {
      const searchInput = document.querySelector<HTMLInputElement>("input[placeholder='Search by name, email...']");
      searchInput?.focus();
    },
  });
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const data = await safeJsonParse<any>(res);
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

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/applications/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedApp.id,
          status: "APPROVED",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve application");
      }

      toast.success("Application approved successfully");
      setDetailOpen(false);
      fetchApplications();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to approve application";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/applications/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedApp.id,
          status: "REJECTED",
          reviewNotes: rejectReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject application");
      }

      toast.success("Application rejected");
      setConfirmRejectOpen(false);
      setDetailOpen(false);
      setRejectReason("");
      fetchApplications();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to reject application";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async (appId: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `application-${appId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to download PDF";
      toast.error(message);
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
        <EmptyState
          icon={FileText}
          title="No applications found"
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Applications will appear here when submitted"
          }
        />
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
                          <span className="text-xs">{(app.interviewStatus || "PENDING").replace(/_/g, " ")}</span>
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
                            asChild
                          >
                            <Link href={`/dashboard/applications/${app.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
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
                        <span>Interview: {(app.interviewStatus || "PENDING").replace(/_/g, " ")}</span>
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
                        asChild
                      >
                        <Link href={`/dashboard/applications/${app.id}`}>
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Link>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Application Details</span>
              {selectedApp && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleDownloadPdf(selectedApp.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList className="w-full flex-wrap h-auto gap-1">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                <TabsTrigger value="family" className="text-xs">Family</TabsTrigger>
                <TabsTrigger value="education" className="text-xs">Education</TabsTrigger>
                <TabsTrigger value="availability" className="text-xs">Schedule</TabsTrigger>
                <TabsTrigger value="essays" className="text-xs">Essays</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Header Card */}
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {selectedApp.photoUrl ? (
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                          <img src={selectedApp.photoUrl} alt="Applicant photo" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-white">
                          <User className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold break-words">
                          {`${selectedApp.firstName || ""} ${selectedApp.middleName ? selectedApp.middleName.charAt(0) + "." : ""} ${selectedApp.lastName || ""} ${selectedApp.suffix || ""}`.trim() || selectedApp.applicantEmail}
                        </h3>
                        <p className="text-sm text-muted-foreground break-words">{selectedApp.applicantEmail}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedApp.studentNumber && (
                            <Badge variant="outline" className="text-xs"><IdCard className="mr-1 h-3 w-3" />{selectedApp.studentNumber}</Badge>
                          )}
                          {selectedApp.college && (
                            <Badge variant="outline" className="text-xs"><GraduationCap className="mr-1 h-3 w-3" />{selectedApp.college}</Badge>
                          )}
                          {selectedApp.program && (
                            <Badge variant="outline" className="text-xs">{selectedApp.program}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={statusConfig[selectedApp.status]?.color || ""} variant="secondary">
                      {statusConfig[selectedApp.status]?.label || selectedApp.status}
                    </Badge>
                  </div>
                </div>

                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {selectedApp.studentNumber && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Student Number</p>
                      <p className="text-sm font-medium">{selectedApp.studentNumber}</p>
                    </div>
                  )}
                  {selectedApp.yearLevel && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Year Level</p>
                      <p className="text-sm font-medium">{selectedApp.yearLevel}</p>
                    </div>
                  )}
                  {selectedApp.section && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Section</p>
                      <p className="text-sm font-medium">{selectedApp.section}</p>
                    </div>
                  )}
                  {selectedApp.gwa && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">GWA</p>
                      <p className="text-sm font-bold text-amber-600">{selectedApp.gwa}</p>
                    </div>
                  )}
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm font-medium">
                      {selectedApp.submittedAt ? format(new Date(selectedApp.submittedAt), "MMM d, yyyy 'at' h:mm a") : "Not submitted yet"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Interview</p>
                    <p className="text-sm font-medium">
                      {(selectedApp.interviewStatus || "PENDING").replace(/_/g, " ")}
                      {selectedApp.interviewScore !== null ? ` — ${selectedApp.interviewScore}/100` : ""}
                    </p>
                  </div>
                </div>

                {/* Quick Essays */}
                {selectedApp.essayWhyApply && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Why I Want to Apply</h4>
                    <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                        {selectedApp.essayWhyApply}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldDisplay label="First Name" value={selectedApp.firstName} />
                  <FieldDisplay label="Middle Name" value={selectedApp.middleName} />
                  <FieldDisplay label="Last Name" value={selectedApp.lastName} />
                  <FieldDisplay label="Suffix" value={selectedApp.suffix} />
                  <FieldDisplay label="Date of Birth" value={selectedApp.dateOfBirth ? format(new Date(selectedApp.dateOfBirth), "MMMM d, yyyy") : null} />
                  <FieldDisplay label="Place of Birth" value={selectedApp.placeOfBirth} />
                  <FieldDisplay label="Sex" value={selectedApp.gender} />
                  <FieldDisplay label="Civil Status" value={selectedApp.civilStatus} />
                  <FieldDisplay label="Citizenship" value={selectedApp.citizenship} />
                  <FieldDisplay label="Religion" value={selectedApp.religion} />
                  <FieldDisplay label="Phone" value={selectedApp.phone} />
                  <FieldDisplay label="Alternate Phone" value={selectedApp.alternatePhone} />
                  <FieldDisplay label="Email" value={selectedApp.email} />
                  <FieldDisplay label="Address" value={selectedApp.residenceAddress} />
                  <FieldDisplay label="City" value={selectedApp.residenceCity} />
                  <FieldDisplay label="Zip Code" value={selectedApp.residenceZip} />
                </div>
              </TabsContent>

              {/* Family Tab */}
              <TabsContent value="family" className="space-y-4 mt-4">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" />Father&apos;s Information</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldDisplay label="Full Name" value={selectedApp.fatherName} />
                    <FieldDisplay label="Occupation" value={selectedApp.fatherOccupation} />
                    <FieldDisplay label="Contact" value={selectedApp.fatherContact} />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold flex items-center gap-2"><Heart className="h-4 w-4" />Mother&apos;s Information</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldDisplay label="Full Name" value={selectedApp.motherName} />
                    <FieldDisplay label="Maiden Name" value={selectedApp.motherMaidenName} />
                    <FieldDisplay label="Occupation" value={selectedApp.motherOccupation} />
                    <FieldDisplay label="Contact" value={selectedApp.motherContact} />
                  </div>
                </div>
                {(selectedApp.guardianName || selectedApp.guardianContact) && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Guardian&apos;s Information</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldDisplay label="Full Name" value={selectedApp.guardianName} />
                      <FieldDisplay label="Relationship" value={selectedApp.guardianRelation} />
                      <FieldDisplay label="Contact" value={selectedApp.guardianContact} />
                      <FieldDisplay label="Siblings Count" value={selectedApp.siblingsCount?.toString()} />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="space-y-4 mt-4">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold">Current Education</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldDisplay label="Student Number" value={selectedApp.studentNumber} />
                    <FieldDisplay label="College" value={selectedApp.college} />
                    <FieldDisplay label="Program" value={selectedApp.program} />
                    <FieldDisplay label="Year Level" value={selectedApp.yearLevel} />
                    <FieldDisplay label="Section" value={selectedApp.section} />
                    <FieldDisplay label="GWA" value={selectedApp.gwa} />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-semibold">Educational Background</h4>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                      <p className="text-xs font-semibold text-muted-foreground">Elementary</p>
                      <div className="grid gap-2 sm:grid-cols-2 mt-1">
                        <FieldDisplay label="School" value={selectedApp.elementarySchool} />
                        <FieldDisplay label="Year Graduated" value={selectedApp.elementaryYear} />
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                      <p className="text-xs font-semibold text-muted-foreground">High School</p>
                      <div className="grid gap-2 sm:grid-cols-2 mt-1">
                        <FieldDisplay label="School" value={selectedApp.highSchool} />
                        <FieldDisplay label="Year Graduated" value={selectedApp.highSchoolYear} />
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                      <p className="text-xs font-semibold text-muted-foreground">Senior High</p>
                      <div className="grid gap-2 sm:grid-cols-2 mt-1">
                        <FieldDisplay label="School" value={selectedApp.seniorHigh} />
                        <FieldDisplay label="Year Graduated" value={selectedApp.seniorHighYear} />
                        <FieldDisplay label="Strand/Track" value={selectedApp.seniorHighTrack} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employment History */}
                {selectedApp.employmentJson && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold">Employment History</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {JSON.parse(selectedApp.employmentJson).map((emp: { company?: string; position?: string; duration?: string; description?: string }, i: number) => (
                        <div key={i} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="font-medium text-sm">{emp.company || "Unknown Company"}</p>
                          <p className="text-xs text-muted-foreground">{emp.position} {emp.duration ? `• ${emp.duration}` : ""}</p>
                          {emp.description && <p className="text-xs text-muted-foreground mt-1">{emp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trainings */}
                {selectedApp.trainingsJson && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold">Trainings & Seminars</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {JSON.parse(selectedApp.trainingsJson).map((t: { name?: string; organizer?: string; date?: string; duration?: string }, i: number) => (
                        <div key={i} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="font-medium text-sm">{t.name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{t.organizer} {t.date ? `• ${t.date}` : ""} {t.duration ? `• ${t.duration}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Character References */}
                {selectedApp.referencesJson && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold">Character References</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {JSON.parse(selectedApp.referencesJson).map((ref: { name?: string; position?: string; organization?: string; phone?: string; email?: string; relationship?: string }, i: number) => (
                        <div key={i} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{ref.name || `Reference ${i + 1}`}</p>
                            {ref.relationship && <Badge variant="secondary" className="text-xs">{ref.relationship}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{ref.position} {ref.organization ? `at ${ref.organization}` : ""}</p>
                          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                            {ref.phone && <span>{ref.phone}</span>}
                            {ref.email && <span>{ref.email}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="mt-4">
                {selectedApp.availabilityJson ? (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold">Weekly Availability</h4>
                    <AvailabilitySummary availabilityJson={selectedApp.availabilityJson} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No availability data provided.</p>
                )}
              </TabsContent>

              {/* Essays Tab */}
              <TabsContent value="essays" className="space-y-4 mt-4">
                {selectedApp.essayWhyApply && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-sm font-semibold">Why I Want to Apply</h4>
                    <p className="text-sm whitespace-pre-wrap break-words">{selectedApp.essayWhyApply}</p>
                  </div>
                )}
                {selectedApp.essayGoals && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-sm font-semibold">My Goals as a Student Assistant</h4>
                    <p className="text-sm whitespace-pre-wrap break-words">{selectedApp.essayGoals}</p>
                  </div>
                )}
                {selectedApp.essaySkills && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-sm font-semibold">Skills I Can Contribute</h4>
                    <p className="text-sm whitespace-pre-wrap break-words">{selectedApp.essaySkills}</p>
                  </div>
                )}
                {selectedApp.essayChallenges && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-sm font-semibold">Balancing Academics & SA Duties</h4>
                    <p className="text-sm whitespace-pre-wrap break-words">{selectedApp.essayChallenges}</p>
                  </div>
                )}
                {!selectedApp.essayWhyApply && !selectedApp.essayGoals && !selectedApp.essaySkills && !selectedApp.essayChallenges && (
                  <p className="text-sm text-muted-foreground">No essay responses provided.</p>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedApp.photoUrl && (
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2"><ImageIcon className="h-4 w-4" />2x2 Photo</p>
                      <div className="flex justify-center">
                        <div className="h-32 w-32 overflow-hidden rounded-lg border bg-slate-100 dark:bg-slate-700">
                          <img src={selectedApp.photoUrl} alt="Applicant photo" className="h-full w-full object-cover" />
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedApp.resumeUrl && (
                    <a href={selectedApp.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
                        <FileText className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Resume / CV</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Download className="h-3 w-3" />Click to view / download</p>
                      </div>
                    </a>
                  )}
                  {selectedApp.gradeReportUrl && (
                    <a href={selectedApp.gradeReportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                        <BookOpen className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Grade Report</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Download className="h-3 w-3" />Click to view / download</p>
                      </div>
                    </a>
                  )}
                  {selectedApp.registrationUrl && (
                    <a href={selectedApp.registrationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/20">
                        <ClipboardList className="h-5 w-5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Registration Form</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Download className="h-3 w-3" />Click to view / download</p>
                      </div>
                    </a>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Buttons */}
          {selectedApp && canManage && !["APPROVED", "REJECTED", "WITHDRAWN", "DRAFT"].includes(selectedApp.status) && (
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={async () => {
                  const name = `${selectedApp.firstName || ""} ${selectedApp.lastName || ""}`.trim() || selectedApp.applicantEmail;
                  const ok = await confirm({
                    title: "Approve Application",
                    description: `Are you sure you want to approve the application from ${name}? The applicant will be notified about the decision.`,
                    confirmText: "Approve",
                  });
                  if (!ok) return;
                  handleApprove();
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Application
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  setRejectReason("");
                  setConfirmRejectOpen(true);
                }}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Application
              </Button>
            </div>
          )}

          {/* Proceed to Interview button */}
          {selectedApp && canManage && !["APPROVED", "REJECTED", "WITHDRAWN"].includes(selectedApp.status) && (
            <div className="border-t pt-4">
              <Button
                className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                onClick={() => {
                  setDetailOpen(false);
                  handleSchedule(selectedApp);
                }}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Proceed to Interview
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={confirmRejectOpen} onOpenChange={setConfirmRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the application from{" "}
              <span className="font-semibold text-foreground">
                {selectedApp
                  ? `${selectedApp.firstName || ""} ${selectedApp.lastName || ""}`.trim() || selectedApp.applicantEmail
                  : "this applicant"}
              </span>
              ? Optionally provide a reason that will be included in the notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Interview Dialog */}
      <ConfirmDialog />
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

// Helper component for availability summary
function AvailabilitySummary({ availabilityJson }: { availabilityJson: string }) {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

  let parsed: Record<string, string[]> = {};
  let totalSlots = 0;
  let isValid = false;

  try {
    parsed = JSON.parse(availabilityJson) as Record<string, string[]>;
    isValid = true;
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return <p className="text-sm text-muted-foreground">Invalid availability data</p>;
  }

  DAYS.forEach((day, i) => {
    const slots = parsed[DAY_KEYS[i]] || [];
    totalSlots += slots.length;
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day, i) => {
          const slots = parsed[DAY_KEYS[i]] || [];
          return (
            <div key={day} className="rounded-lg border px-3 py-2">
              <p className="text-xs font-semibold">{day}</p>
              <p className="text-xs text-muted-foreground">
                {slots.length > 0 ? slots.join(", ") : "None"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Total: {totalSlots} time slots</p>
    </div>
  );
}
