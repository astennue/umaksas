"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  Search,
  Filter,
  Plus,
  Eye,
  Trash2,
  Lock,
  Send,
  CheckCircle2,
  Star,
  TrendingUp,
  Users,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Award,
  Target,
  Clock,
  MessageSquare,
  Heart,
  UsersRound,
  Building2,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";
import { RoleGuard } from "@/components/auth/role-guard";
import { format } from "date-fns";

// ========== Types ==========
interface Evaluation {
  id: string;
  saId: string;
  saName: string;
  saEmail: string;
  saPhotoUrl: string | null;
  saCollege: string | null;
  saProgram: string | null;
  saStudentNumber: string | null;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorEmail: string;
  evaluatorRole: string;
  officeId: string | null;
  officeName: string | null;
  officeCode: string | null;
  month: number;
  monthName: string;
  year: number;
  semester: string | null;
  academicYear: string | null;
  punctuality: number;
  workQuality: number;
  initiative: number;
  teamwork: number;
  communication: number;
  attitude: number;
  totalScore: number;
  rating: string | null;
  strengths: string | null;
  improvements: string | null;
  supervisorComments: string | null;
  status: string;
  isLocked: boolean;
  lockedAt: string | null;
  supervisorSignedAt: string | null;
  hrVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationSummary {
  totalEvaluations: number;
  avgTotalScore: number;
  excellentCount: number;
  pendingReviews: number;
  draftCount: number;
  submittedCount: number;
  acknowledgedCount: number;
  categoryAverages: Record<string, number>;
  ratingDistribution: Record<string, number>;
  monthlyTrends: { month: number; year: number; monthName: string; count: number; avgScore: number }[];
  topSAs: { id: string; name: string; avgScore: number; count: number }[];
}

interface SAOption {
  id: string;
  name: string;
  email: string;
  college: string | null;
  officeName: string | null;
}

interface SupervisorOffice {
  id: string;
  name: string;
  code: string | null;
}

// ========== Constants ==========
const ratingConfig: Record<string, { label: string; color: string; bg: string }> = {
  EXCELLENT: {
    label: "Excellent",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  OUTSTANDING: {
    label: "Outstanding",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  VERY_SATISFACTORY: {
    label: "Very Satisfactory",
    color: "text-cyan-700 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  SATISFACTORY: {
    label: "Satisfactory",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  FAIR: {
    label: "Fair",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  POOR: {
    label: "Poor",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  ACKNOWLEDGED: { label: "Acknowledged", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

const scoreCategories = [
  { key: "punctuality", label: "Punctuality", icon: Clock },
  { key: "workQuality", label: "Work Quality", icon: Star },
  { key: "initiative", label: "Initiative", icon: Target },
  { key: "teamwork", label: "Teamwork", icon: UsersRound },
  { key: "communication", label: "Communication", icon: MessageSquare },
  { key: "attitude", label: "Attitude", icon: Heart },
] as const;

type ScoreKey = keyof typeof scoreCategories extends { key: infer K } ? K : never;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

/** Get rating label from total score (1-5 scale, max 30) */
function getRatingFromTotal(total: number): string {
  if (total >= 25) return "OUTSTANDING";
  if (total >= 19) return "VERY_SATISFACTORY";
  if (total >= 13) return "SATISFACTORY";
  if (total >= 7) return "FAIR";
  return "POOR";
}

// ========== Main Page ==========
export default function EvaluationsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;

  const isSupervisor = userRole === "OFFICE_SUPERVISOR";
  const isReadOnly = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");

  // State
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Supervisor-specific state
  const [supervisorOffice, setSupervisorOffice] = useState<SupervisorOffice | null>(null);
  const [assignedSAs, setAssignedSAs] = useState<SAOption[]>([]);
  const [officeLoading, setOfficeLoading] = useState(true);

  // Filters (for read-only view)
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(currentYear.toString());
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Modals
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEval, setDetailEval] = useState<Evaluation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state (1-5 scale)
  const [formSA, setFormSA] = useState("");
  const [formSAName, setFormSAName] = useState("");
  const [formMonth, setFormMonth] = useState((new Date().getMonth() + 1).toString());
  const [formYear, setFormYear] = useState(currentYear.toString());
  const [formScores, setFormScores] = useState<Record<ScoreKey, number>>({
    punctuality: 3,
    workQuality: 3,
    initiative: 3,
    teamwork: 3,
    communication: 3,
    attitude: 3,
  });
  const [formComments, setFormComments] = useState("");

  // ========== Data Fetching ==========

  // Fetch supervisor office info
  const fetchSupervisorOffice = useCallback(async () => {
    if (!isSupervisor || !userId) return;
    try {
      const res = await fetch("/api/my-office");
      if (!res.ok) {
        setSupervisorOffice(null);
        return;
      }
      const data = await res.json();
      setSupervisorOffice(data);
    } catch {
      setSupervisorOffice(null);
    } finally {
      setOfficeLoading(false);
    }
  }, [isSupervisor, userId]);

  // Fetch SAs assigned to the supervisor's office
  const fetchAssignedSAs = useCallback(async () => {
    if (!isSupervisor || !supervisorOffice) return;
    try {
      const res = await fetch(
        `/api/sa-wall?office=${encodeURIComponent(supervisorOffice.name)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setAssignedSAs(
        data.map(
          (sa: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            college?: string;
            officeName?: string;
          }) => ({
            id: sa.id,
            name: `${sa.firstName} ${sa.lastName}`,
            email: sa.email,
            college: sa.college || null,
            officeName: sa.officeName || null,
          })
        )
      );
    } catch {
      // ignore
    }
  }, [isSupervisor, supervisorOffice]);

  // Fetch evaluations (for all roles)
  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);
      if (monthFilter !== "all") params.set("month", monthFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/evaluations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      const data = await res.json();
      setEvaluations(data.evaluations || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load evaluations");
    } finally {
      setLoading(false);
    }
  }, [page, search, monthFilter, yearFilter, ratingFilter, statusFilter]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/evaluations/summary");
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      setSummary(data);
    } catch {
      // ignore
    }
  }, []);

  // ========== Effects ==========

  useEffect(() => {
    if (isSupervisor) {
      fetchSupervisorOffice();
    } else if (isReadOnly) {
      fetchEvaluations();
      fetchSummary();
    }
  }, [isSupervisor, isReadOnly]);

  useEffect(() => {
    if (supervisorOffice) {
      fetchAssignedSAs();
      // Also fetch evaluations for the supervisor's office
      fetchEvaluations();
      fetchSummary();
    }
  }, [supervisorOffice]);

  // Re-fetch when read-only filters change
  useEffect(() => {
    if (isReadOnly && !loading) {
      fetchEvaluations();
    }
  }, [page, search, monthFilter, yearFilter, ratingFilter, statusFilter, isReadOnly]);

  // ========== Form Logic ==========

  const formTotal = Object.values(formScores).reduce((a, b) => a + b, 0);
  const formRating = getRatingFromTotal(formTotal);
  const formMaxScore = 30; // 6 categories * 5 max

  const resetForm = () => {
    setFormSA("");
    setFormSAName("");
    setFormMonth((new Date().getMonth() + 1).toString());
    setFormYear(currentYear.toString());
    setFormScores({
      punctuality: 3,
      workQuality: 3,
      initiative: 3,
      teamwork: 3,
      communication: 3,
      attitude: 3,
    });
    setFormComments("");
  };

  const openCreateForm = (saId: string, saName: string) => {
    resetForm();
    setFormSA(saId);
    setFormSAName(saName);
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formSA) {
      toast.error("Please select a student assistant");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        saId: formSA,
        officeId: supervisorOffice?.id || null,
        month: parseInt(formMonth, 10),
        year: parseInt(formYear, 10),
        punctuality: formScores.punctuality,
        workQuality: formScores.workQuality,
        initiative: formScores.initiative,
        teamwork: formScores.teamwork,
        communication: formScores.communication,
        attitude: formScores.attitude,
        totalScore: formTotal,
        rating: formRating,
        comments: formComments || null,
      };

      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create evaluation");
      }

      toast.success("Evaluation created successfully");
      setFormOpen(false);
      resetForm();
      fetchEvaluations();
      fetchSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit evaluation (DRAFT → SUBMITTED)
  const handleSubmit = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/evaluations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      toast.success("Evaluation submitted successfully");
      setDetailOpen(false);
      fetchEvaluations();
      fetchSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acknowledge evaluation (SUBMITTED → ACKNOWLEDGED)
  const handleAcknowledge = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/evaluations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to acknowledge");
      }
      toast.success("Evaluation acknowledged successfully");
      setDetailOpen(false);
      fetchEvaluations();
      fetchSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to acknowledge");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete evaluation
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/evaluations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Evaluation deleted successfully");
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchEvaluations();
      fetchSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  // ========== Loading State ==========
  if (loading && evaluations.length === 0 && !summary && (officeLoading || !isSupervisor)) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  // ========== Render ==========
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR"]}>
    <div className="space-y-6">
      {/* ========== OFFICE SUPERVISOR VIEW ========== */}
      {isSupervisor && (
        <>
          {/* Page Header */}
          <CRUDToolbar
            title="Evaluations"
            entityLabel="Evaluations"
            showAdd={false}
            onSearch={isReadOnly ? setSearch : undefined}
            extra={
              <Badge variant="secondary" className="bg-[#1e3a8a]/10 text-[#1e3a8a] w-fit text-sm px-3 py-1 max-w-[300px]">
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                <span className="truncate">{supervisorOffice?.name || "Loading office..."}</span>
              </Badge>
            }
          />

          {/* Office Info Card */}
          {supervisorOffice && (
            <Card className="border-[#1e3a8a]/20 bg-gradient-to-r from-[#1e3a8a]/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-[#1e3a8a]/10 p-3">
                    <Building2 className="h-6 w-6 text-[#1e3a8a]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      SAs assigned to {supervisorOffice.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {assignedSAs.length} student assistant{assignedSAs.length !== 1 ? "s" : ""} in your office
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Office Assigned */}
          {!officeLoading && !supervisorOffice && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No office assigned</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You are not currently assigned as a supervisor to any office. Contact the administrator.
                </p>
              </CardContent>
            </Card>
          )}

          {/* SA Cards Grid */}
          {supervisorOffice && assignedSAs.length === 0 && !officeLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No Student Assistants are currently assigned to your office.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Once SAs are assigned to {supervisorOffice.name}, they will appear here for evaluation.
                </p>
              </CardContent>
            </Card>
          )}

          {supervisorOffice && assignedSAs.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assignedSAs.map((sa) => (
                <Card key={sa.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    {/* SA Avatar & Info */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-bold">
                        {sa.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {sa.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{sa.email}</p>
                        {sa.college && (
                          <div className="flex items-center gap-1 mt-1">
                            <GraduationCap className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">{sa.college}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Office Tag */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800">
                        <Building2 className="mr-1 h-3 w-3" />
                        {sa.officeName || supervisorOffice.name}
                      </Badge>
                    </div>

                    {/* Create Evaluation Button */}
                    <Button
                      onClick={() => openCreateForm(sa.id, sa.name)}
                      className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-sm"
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Create Evaluation
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Existing Evaluations for this Office */}
          {supervisorOffice && evaluations.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Existing Evaluations
                </h2>
                <Card>
                  <CardContent className="p-0">
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student Assistant</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {evaluations.map((ev) => {
                            const rating = ratingConfig[ev.rating || ""];
                            const status = statusConfig[ev.status || ""];
                            const isOutOfScale = ev.totalScore <= 30;
                            return (
                              <TableRow key={ev.id} className="group">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                                      {ev.saName
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate max-w-[180px]">{ev.saName}</p>
                                      {ev.saCollege && (
                                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{ev.saCollege}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm">{ev.monthName} {ev.year}</p>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <span className="font-semibold">{ev.totalScore}</span>
                                    <span className="text-muted-foreground">
                                      {" "}/ {isOutOfScale ? "30" : "60"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {ev.rating && rating ? (
                                    <Badge variant="secondary" className={`${rating.bg} ${rating.color}`}>
                                      {rating.label}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {status ? (
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="secondary" className={status.color}>
                                        {status.label}
                                      </Badge>
                                      {ev.isLocked && (
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        setDetailEval(ev);
                                        setDetailOpen(true);
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    {ev.status === "DRAFT" && !ev.isLocked && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleSubmit(ev.id)}
                                        disabled={isSubmitting}
                                      >
                                        <Send className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-red-600 hover:text-red-700"
                                      onClick={() => {
                                        setDeleteTarget(ev);
                                        setDeleteOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden">
                      <div className="divide-y">
                        {evaluations.map((ev) => {
                          const rating = ratingConfig[ev.rating || ""];
                          const status = statusConfig[ev.status || ""];
                          return (
                            <div key={ev.id} className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                                    {ev.saName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{ev.saName}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {ev.monthName} {ev.year}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {ev.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                  {status && (
                                    <Badge variant="secondary" className={status.color}>{status.label}</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {ev.rating && rating ? (
                                    <Badge variant="secondary" className={`${rating.bg} ${rating.color}`}>
                                      {rating.label}
                                    </Badge>
                                  ) : null}
                                </div>
                                <span className="text-sm font-semibold">{ev.totalScore}</span>
                              </div>
                              <div className="flex items-center gap-1 pt-1 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => { setDetailEval(ev); setDetailOpen(true); }}
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  View
                                </Button>
                                {ev.status === "DRAFT" && !ev.isLocked && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs flex-1"
                                    onClick={() => handleSubmit(ev.id)}
                                    disabled={isSubmitting}
                                  >
                                    <Send className="mr-1 h-3 w-3" />
                                    Submit
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}

      {/* ========== READ-ONLY VIEW (SUPER_ADMIN / ADVISER / OFFICER) ========== */}
      {isReadOnly && (
        <>
          {/* Page Header */}
          <CRUDToolbar
            title="Evaluations"
            entityLabel="Evaluations"
            showAdd={false}
            onSearch={setSearch}
            extra={
              <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 w-fit text-sm px-3 py-1">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Read-Only
              </Badge>
            }
          />

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Total Evaluations",
                value: summary?.totalEvaluations ?? 0,
                icon: ClipboardCheck,
                color: "text-[#1e3a8a]",
                bg: "bg-[#1e3a8a]/10",
              },
              {
                label: "Average Score",
                value: summary?.avgTotalScore
                  ? `${summary.avgTotalScore.toFixed(1)}`
                  : "0",
                icon: TrendingUp,
                color: "text-emerald-600",
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
              },
              {
                label: "Top Ratings",
                value: summary?.excellentCount ?? 0,
                icon: Award,
                color: "text-green-600",
                bg: "bg-green-50 dark:bg-green-900/20",
              },
              {
                label: "Pending Reviews",
                value: summary?.pendingReviews ?? 0,
                icon: FileCheck,
                color: "text-amber-600",
                bg: "bg-amber-50 dark:bg-amber-900/20",
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rating Distribution & Top Performers */}
          {summary && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Rating Distribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(summary.ratingDistribution).map(([rating, count]) => {
                    const config = ratingConfig[rating];
                    const maxCount = Math.max(...Object.values(summary.ratingDistribution), 1);
                    return (
                      <div key={rating} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${config?.color}`}>
                            {config?.label || rating}
                          </span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${config?.bg} ${config?.color}`}
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                              minWidth: count > 0 ? "8px" : "0",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Category Averages */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Category Averages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scoreCategories.map(({ key, label }) => {
                    const avg = summary.categoryAverages[key] || 0;
                    const maxAvg = avg <= 5 ? 5 : 10;
                    const percentage = (avg / maxAvg) * 100;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {avg.toFixed(1)} / {maxAvg}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-[#1e3a8a] transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.topSAs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No evaluations yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {summary.topSAs.map((sa, idx) => (
                        <div key={sa.id} className="flex items-center gap-3">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              idx === 0
                                ? "bg-amber-100 text-amber-700"
                                : idx === 1
                                  ? "bg-slate-200 text-slate-600"
                                  : idx === 2
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{sa.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sa.count} evaluation{sa.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-[#1e3a8a]">
                              {sa.avgScore.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={monthFilter}
                    onValueChange={(v) => {
                      setMonthFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={yearFilter}
                    onValueChange={(v) => {
                      setYearFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={ratingFilter}
                    onValueChange={(v) => {
                      setRatingFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[170px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      {Object.entries(ratingConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluations Table (Read-Only) */}
          <Card>
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Assistant</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-muted-foreground">No evaluations found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {search ||
                              monthFilter !== "all" ||
                              yearFilter !== "all" ||
                              ratingFilter !== "all" ||
                              statusFilter !== "all"
                                ? "Try adjusting your filters"
                                : "No evaluations have been created yet"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluations.map((ev) => {
                        const rating = ratingConfig[ev.rating || ""];
                        const status = statusConfig[ev.status || ""];
                        const isOutOfScale = ev.totalScore <= 30;
                        return (
                          <TableRow key={ev.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                                  {ev.saName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate max-w-[180px]">{ev.saName}</p>
                                  {ev.saCollege && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                      {ev.saCollege}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm truncate max-w-[150px]">{ev.officeName || "—"}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">
                                {ev.monthName} {ev.year}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-semibold">{ev.totalScore}</span>
                                <span className="text-muted-foreground">
                                  {" "}/ {isOutOfScale ? "30" : "60"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {ev.rating && rating ? (
                                <Badge variant="secondary" className={`${rating.bg} ${rating.color}`}>
                                  {rating.label}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {status ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="secondary" className={status.color}>
                                    {status.label}
                                  </Badge>
                                  {ev.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setDetailEval(ev);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                <div className="divide-y">
                  {evaluations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">No evaluations found</p>
                      <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters</p>
                    </div>
                  ) : (
                    evaluations.map((ev) => {
                      const rating = ratingConfig[ev.rating || ""];
                      const status = statusConfig[ev.status || ""];
                      return (
                        <div key={ev.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                                {ev.saName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{ev.saName}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {ev.officeName || "No office"} &bull; {ev.monthName} {ev.year}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {ev.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                              {status && (
                                <Badge variant="secondary" className={status.color}>
                                  {status.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {ev.rating && rating ? (
                                <Badge variant="secondary" className={`${rating.bg} ${rating.color}`}>
                                  {rating.label}
                                </Badge>
                              ) : null}
                            </div>
                            <span className="text-sm font-semibold">
                              {ev.totalScore}{" "}
                              <span className="text-muted-foreground font-normal">/ {ev.totalScore <= 30 ? "30" : "60"}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1 pt-1 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={() => {
                                setDetailEval(ev);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
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
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* ========== Detail Modal ========== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Evaluation Details
              {detailEval?.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </DialogTitle>
            <DialogDescription>
              View detailed evaluation for the student assistant
            </DialogDescription>
          </DialogHeader>

          {detailEval && (
            <div className="space-y-6">
              {/* SA & Evaluator Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Student Assistant
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-bold">
                      {detailEval.saName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{detailEval.saName}</p>
                      <p className="text-xs text-muted-foreground">{detailEval.saEmail}</p>
                      {detailEval.saCollege && (
                        <p className="text-xs text-muted-foreground">{detailEval.saCollege}</p>
                      )}
                    </div>
                  </div>
                  {detailEval.saStudentNumber && (
                    <p className="text-xs text-muted-foreground">
                      Student No: {detailEval.saStudentNumber}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Evaluator
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                      {detailEval.evaluatorName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{detailEval.evaluatorName}</p>
                      <p className="text-xs text-muted-foreground">{detailEval.evaluatorEmail}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Period & Office */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-sm font-semibold">
                    {detailEval.monthName} {detailEval.year}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Office</p>
                  <p className="text-sm font-semibold truncate">{detailEval.officeName || "—"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex items-center justify-center gap-1">
                    {statusConfig[detailEval.status] && (
                      <Badge
                        variant="secondary"
                        className={statusConfig[detailEval.status].color}
                      >
                        {statusConfig[detailEval.status].label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Score</p>
                  <p className="text-sm font-semibold">{detailEval.totalScore}</p>
                </div>
              </div>

              {/* Score Bars */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Performance Scores</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[#1e3a8a]">{detailEval.totalScore}</span>
                    <span className="text-sm text-muted-foreground">
                      / {detailEval.totalScore <= 30 ? "30" : "60"}
                    </span>
                    {detailEval.rating && ratingConfig[detailEval.rating] && (
                      <Badge
                        variant="secondary"
                        className={`${ratingConfig[detailEval.rating].bg} ${ratingConfig[detailEval.rating].color}`}
                      >
                        {ratingConfig[detailEval.rating].label}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {scoreCategories.map(({ key, label, icon: Icon }) => {
                    const val = detailEval[key as keyof Evaluation] as number;
                    const maxScore = detailEval.totalScore <= 30 ? 5 : 10;
                    const percentage = (val / maxScore) * 100;
                    const getColor = (v: number, max: number) => {
                      const pct = (v / max) * 100;
                      if (pct >= 80) return "bg-green-500";
                      if (pct >= 60) return "bg-blue-500";
                      if (pct >= 40) return "bg-amber-500";
                      if (pct >= 20) return "bg-orange-500";
                      return "bg-red-500";
                    };
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-36 shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{label}</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full transition-all ${getColor(val, maxScore)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold w-8 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Comments */}
              <div className="space-y-4">
                {detailEval.strengths && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Strengths
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailEval.strengths}
                    </p>
                  </div>
                )}
                {detailEval.improvements && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      Areas for Improvement
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailEval.improvements}
                    </p>
                  </div>
                )}
                {detailEval.supervisorComments && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      Overall Comments
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {detailEval.supervisorComments}
                    </p>
                  </div>
                )}
                {!detailEval.strengths && !detailEval.improvements && !detailEval.supervisorComments && (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments provided</p>
                )}
              </div>

              {/* Timestamps */}
              <Separator />
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Created: {format(new Date(detailEval.createdAt), "MMM d, yyyy h:mm a")}</span>
                <span>Updated: {format(new Date(detailEval.updatedAt), "MMM d, yyyy h:mm a")}</span>
                {detailEval.supervisorSignedAt && (
                  <span className="text-green-600">
                    Signed: {format(new Date(detailEval.supervisorSignedAt), "MMM d, yyyy")}
                  </span>
                )}
                {detailEval.hrVerifiedAt && (
                  <span className="text-blue-600">
                    Verified: {format(new Date(detailEval.hrVerifiedAt), "MMM d, yyyy")}
                  </span>
                )}
              </div>

              {/* Actions for SUPER_ADMIN / ADVISER (acknowledge) */}
              {isReadOnly && ["SUPER_ADMIN", "ADVISER"].includes(userRole || "") && detailEval.status === "SUBMITTED" && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                    onClick={() => handleAcknowledge(detailEval.id)}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Acknowledging..." : "Acknowledge"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== Create Evaluation Form Dialog ========== */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Evaluation</DialogTitle>
            <DialogDescription>
              {formSAName
                ? `Evaluate ${formSAName} for ${MONTHS[parseInt(formMonth, 10) - 1]} ${formYear}`
                : "Create a new performance evaluation for a student assistant"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* SA Info (pre-selected for supervisor) */}
            {formSA && (
              <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-bold">
                    {formSAName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{formSAName}</p>
                    <p className="text-xs text-muted-foreground">
                      {supervisorOffice?.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Period Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month *</Label>
                <Select value={formMonth} onValueChange={setFormMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select value={formYear} onValueChange={setFormYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Scoring (1-5 scale) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Performance Scores (1-5 Scale)</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-[#1e3a8a]">{formTotal}</span>
                  <span className="text-sm text-muted-foreground">/ {formMaxScore}</span>
                  <Badge
                    variant="secondary"
                    className={`${ratingConfig[formRating]?.bg} ${ratingConfig[formRating]?.color}`}
                  >
                    {ratingConfig[formRating]?.label}
                  </Badge>
                </div>
              </div>

              {/* Total Score Progress Bar */}
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all bg-[#1e3a8a]"
                  style={{ width: `${(formTotal / formMaxScore) * 100}%` }}
                />
              </div>

              {/* Score Sliders */}
              {scoreCategories.map(({ key, label, icon: Icon }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">{label}</Label>
                    </div>
                    <span className="text-sm font-bold">{formScores[key]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={formScores[key]}
                      onChange={(e) =>
                        setFormScores((prev) => ({
                          ...prev,
                          [key]: parseInt(e.target.value, 10),
                        }))
                      }
                      className="flex-1 h-2 cursor-pointer accent-[#1e3a8a]"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>1 - Poor</span>
                    <span>2 - Fair</span>
                    <span>3 - Satisfactory</span>
                    <span>4 - Very Good</span>
                    <span>5 - Excellent</span>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Overall Comments */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Overall Comments</Label>
              <Textarea
                placeholder="Provide overall comments about the student assistant's performance..."
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={isSubmitting || !formSA}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {isSubmitting ? "Creating..." : "Submit Evaluation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Delete Confirmation ========== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Evaluation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this evaluation for{" "}
              <strong>{deleteTarget?.saName}</strong> ({deleteTarget?.monthName} {deleteTarget?.year})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RoleGuard>
  );
}
