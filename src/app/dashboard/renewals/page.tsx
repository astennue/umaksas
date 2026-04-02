"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  RefreshCw,
  Search,
  Filter,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Building2,
  ArrowRight,
  Loader2,
  UserCheck,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BadgeCheck,
  Send,
  GraduationCap,
  Info,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";

interface Renewal {
  id: string;
  status: string;
  statementOfIntent: string | null;
  availabilityJson: string | null;
  availabilityRequired: boolean;
  requestTransfer: boolean;
  transferReason: string | null;
  newOfficeId: string | null;
  intentLetterUrl: string | null;
  reportOfGradeUrl: string | null;
  certOfRegUrl: string | null;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  academicYear: string | null;
  semester: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profile?: {
      college: string | null;
      program: string | null;
      yearLevel: string | null;
      studentNumber: string | null;
      officeId: string | null;
      office?: { id: string; name: string; code: string } | null;
    };
  };
  newOffice?: { id: string; name: string; code: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_REVIEW: { label: "Pending Review", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  UNDER_REVIEW: { label: "Under Review", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: ArrowRight },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  REQUIRES_CHANGES: { label: "Requires Changes", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle },
};

export default function RenewalsManagementPage() {
  const { data: session } = useSession();
  const user = session?.user as { id: string; role: string } | undefined;

  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [renewalSeasonOpen, setRenewalSeasonOpen] = useState(false);

  // Dialog state
  const [selectedRenewal, setSelectedRenewal] = useState<Renewal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [seasonToggleOpen, setSeasonToggleOpen] = useState(false);

  // Review form state
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Season toggle
  const [togglingSeason, setTogglingSeason] = useState(false);

  const isReviewer = user?.role && ["SUPER_ADMIN", "ADVISER", "PRESIDENT"].includes(user.role);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canDelete = isSuperAdmin;

  const fetchRenewals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/renewals?${params}`);
      if (res.ok) {
        const data = await res.json();
        let filtered = data.renewals || [];

        // Client-side search
        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = filtered.filter(
            (r: Renewal) =>
              `${r.user.firstName} ${r.user.lastName}`.toLowerCase().includes(q) ||
              r.user.email.toLowerCase().includes(q) ||
              r.user.profile?.college?.toLowerCase().includes(q) ||
              r.user.profile?.office?.name?.toLowerCase().includes(q)
          );
        }

        setRenewals(filtered);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching renewals:", error);
      toast.error("Failed to load renewals");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, search]);

  // Fetch season status
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/system-settings");
        if (res.ok) {
          const data = await res.json();
          setRenewalSeasonOpen(data.renewalOpen === true);
        }
      } catch {
        // ignore
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (session) fetchRenewals();
  }, [session, fetchRenewals]);

  // Stats
  const stats = {
    total: renewals.length,
    pending_review: renewals.filter((r) => r.status === "PENDING_REVIEW").length,
    under_review: renewals.filter((r) => r.status === "UNDER_REVIEW").length,
    approved: renewals.filter((r) => r.status === "APPROVED").length,
    rejected: renewals.filter((r) => r.status === "REJECTED").length,
    requires_changes: renewals.filter((r) => r.status === "REQUIRES_CHANGES").length,
  };

  const openReview = (renewal: Renewal) => {
    setSelectedRenewal(renewal);
    setReviewStatus("");
    setReviewNotes("");
    setReviewOpen(true);
  };

  const handleReview = async () => {
    if (!selectedRenewal || !reviewStatus) {
      toast.error("Please select a status");
      return;
    }

    if (reviewStatus === "APPROVED" && selectedRenewal.requestTransfer) {
      setConfirmTransferOpen(true);
      return;
    }

    await submitReview(false);
  };

  const submitReview = async (confirmTransfer: boolean) => {
    if (!selectedRenewal) return;

    setReviewing(true);
    try {
      const body: Record<string, unknown> = {
        status: reviewStatus,
        reviewNotes: reviewNotes || null,
      };

      if (confirmTransfer) {
        body.confirmTransfer = true;
      }

      const res = await fetch(`/api/renewals/${selectedRenewal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update renewal");

      toast.success(data.message || "Renewal updated successfully");
      setReviewOpen(false);
      setConfirmTransferOpen(false);
      fetchRenewals();
    } catch (error) {
      console.error("Review error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update renewal");
    } finally {
      setReviewing(false);
    }
  };

  // Toggle renewal season
  const handleToggleSeason = async () => {
    setTogglingSeason(true);
    try {
      const res = await fetch("/api/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalOpen: !renewalSeasonOpen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");
      setRenewalSeasonOpen(!renewalSeasonOpen);
      toast.success(`Renewal season ${!renewalSeasonOpen ? "opened" : "closed"} successfully`);
      setSeasonToggleOpen(false);
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setTogglingSeason(false);
    }
  };

  const getAvailabilitySummary = (availabilityJson: string | null): string => {
    if (!availabilityJson) return "Not provided";
    try {
      const data = JSON.parse(availabilityJson);
      const days = Object.keys(data);
      const totalSlots = days.reduce((sum: number, day: string) => sum + (data[day]?.length || 0), 0);
      return `${totalSlots} slots across ${days.length} day${days.length !== 1 ? "s" : ""}`;
    } catch {
      return "Invalid data";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <CRUDToolbar
        title="Renewal Management"
        entityLabel="Renewals"
        onSearch={(value) => { setSearch(value); setPage(1); }}
        showAdd={false}
        extra={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSeasonToggleOpen(true)}
                className={cn(
                  "gap-2",
                  renewalSeasonOpen && "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                )}
              >
                {renewalSeasonOpen ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
                Season {renewalSeasonOpen ? "Open" : "Closed"}
              </Button>
            )}
            <Button variant="outline" onClick={fetchRenewals} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Season Banner */}
      {!renewalSeasonOpen && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Renewal season is currently closed
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Student Assistants cannot submit renewal applications until the season is opened.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.pending_review}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reviewing</p>
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{stats.under_review}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/20">
              <ArrowRight className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.approved}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejected</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.rejected}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Changes</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.requires_changes}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search moved to CRUDToolbar */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="REQUIRES_CHANGES">Requires Changes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Renewal Cards */}
      {renewals.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground/25 mb-3" />
            <p className="text-muted-foreground font-medium">No renewals found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search or filters"
                : "No renewal applications have been submitted yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {renewals.map((renewal) => {
            const statusInfo = statusConfig[renewal.status] || statusConfig.PENDING_REVIEW;
            const StatusIcon = statusInfo.icon;
            const name = `${renewal.user.firstName || ""} ${renewal.user.lastName || ""}`.trim() || renewal.user.email;

            return (
              <Card key={renewal.id} className="border-0 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-1 bg-gradient-to-r from-blue-700 to-amber-500" />
                <CardContent className="p-5 space-y-4">
                  {/* Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{renewal.user.email}</p>
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", statusInfo.color)} variant="secondary">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {renewal.user.profile?.college && (
                      <p className="text-xs text-muted-foreground">{renewal.user.profile.college}</p>
                    )}
                    {renewal.user.profile?.office && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {renewal.user.profile.office.name}
                      </div>
                    )}
                    {renewal.statementOfIntent && (
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        &quot;{renewal.statementOfIntent.substring(0, 80)}...&quot;
                      </p>
                    )}
                    {renewal.requestTransfer && (
                      <Badge variant="outline" className="text-[10px]">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Transfer to {renewal.newOffice?.name || "Unknown"}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(renewal.createdAt), "MMM d, yyyy")}
                    </div>
                    <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded">
                      {renewal.id.substring(0, 8)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => { setSelectedRenewal(renewal); setDetailOpen(true); }}
                    >
                      <Eye className="mr-1.5 h-3 w-3" />
                      View
                    </Button>
                    {isReviewer && ["PENDING_REVIEW", "UNDER_REVIEW", "REQUIRES_CHANGES"].includes(renewal.status) && (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-blue-700 hover:bg-blue-800"
                        onClick={() => openReview(renewal)}
                      >
                        <Send className="mr-1.5 h-3 w-3" />
                        Review
                      </Button>
                    )}
                    {canDelete && (
                      <CRUDActions
                        onDelete={() => {
                          setSelectedRenewal(renewal);
                          setDeleteOpen(true);
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Renewal Details
              {selectedRenewal && (
                <Badge className={cn("text-xs", statusConfig[selectedRenewal.status]?.color)} variant="secondary">
                  {statusConfig[selectedRenewal.status]?.label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRenewal && `${selectedRenewal.user.firstName} ${selectedRenewal.user.lastName} — ${selectedRenewal.id}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRenewal && (
            <div className="space-y-6">
              {/* SA Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Student Assistant</p>
                  <p className="text-sm font-semibold">{selectedRenewal.user.firstName} {selectedRenewal.user.lastName}</p>
                  <p className="text-xs text-muted-foreground">{selectedRenewal.user.email}</p>
                  {selectedRenewal.user.profile?.college && (
                    <p className="text-xs text-muted-foreground">{selectedRenewal.user.profile.college} — {selectedRenewal.user.profile.program}</p>
                  )}
                  {selectedRenewal.user.profile?.yearLevel && (
                    <p className="text-xs text-muted-foreground">Year Level: {selectedRenewal.user.profile.yearLevel}</p>
                  )}
                  {selectedRenewal.user.profile?.studentNumber && (
                    <p className="text-xs text-muted-foreground">Student No: {selectedRenewal.user.profile.studentNumber}</p>
                  )}
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Current Office</p>
                  <p className="text-sm font-semibold">{selectedRenewal.user.profile?.office?.name || "Unassigned"}</p>
                  {selectedRenewal.academicYear && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRenewal.academicYear} — {selectedRenewal.semester}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Submitted: {format(new Date(selectedRenewal.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {/* Statement of Intent */}
              {selectedRenewal.statementOfIntent && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Statement of Intent
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRenewal.statementOfIntent}
                  </p>
                </div>
              )}

              {/* Availability */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Weekly Availability
                  {selectedRenewal.availabilityRequired && (
                    <Badge variant="outline" className="text-[10px]">Required</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getAvailabilitySummary(selectedRenewal.availabilityJson)}
                </p>
              </div>

              {/* Documents */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Documents
                </p>
                <div className="space-y-1.5">
                  {selectedRenewal.reportOfGradeUrl && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="default" className="text-[10px] w-20 justify-center">
                        Uploaded
                      </Badge>
                      <span>Report of Grades</span>
                    </div>
                  )}
                  {selectedRenewal.certOfRegUrl && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="default" className="text-[10px] w-20 justify-center">
                        Uploaded
                      </Badge>
                      <span>Certificate of Registration</span>
                    </div>
                  )}
                  {selectedRenewal.intentLetterUrl && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="text-[10px] w-20 justify-center">
                        Uploaded
                      </Badge>
                      <span>Intent Letter</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer */}
              {selectedRenewal.requestTransfer && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <Building2 className="h-4 w-4" />
                    Office Transfer Request
                  </p>
                  {selectedRenewal.newOffice && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">To:</span> {selectedRenewal.newOffice.name}
                    </p>
                  )}
                  {selectedRenewal.transferReason && (
                    <p className="text-xs text-muted-foreground italic">
                      <span className="font-medium">Reason:</span> &quot;{selectedRenewal.transferReason}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Review Notes */}
              {selectedRenewal.reviewNotes && (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Review Notes</p>
                  <p className="text-sm">{selectedRenewal.reviewNotes}</p>
                  {selectedRenewal.reviewedAt && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed: {format(new Date(selectedRenewal.reviewedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {isReviewer && ["PENDING_REVIEW", "UNDER_REVIEW", "REQUIRES_CHANGES"].includes(selectedRenewal.status) && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    onClick={() => { setDetailOpen(false); openReview(selectedRenewal); }}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Renewal</DialogTitle>
            <DialogDescription>
              {selectedRenewal && `Reviewing renewal for ${selectedRenewal.user.firstName} ${selectedRenewal.user.lastName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRenewal?.requestTransfer && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Transfer Request</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  This SA wants to transfer from <strong>{selectedRenewal.user.profile?.office?.name}</strong> to <strong>{selectedRenewal.newOffice?.name}</strong>.
                  {reviewStatus === "APPROVED" && " The SA's office will be updated upon approval."}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="review-status">Decision</Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger id="review-status">
                  <SelectValue placeholder="Select a decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDER_REVIEW">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3 text-violet-500" />
                      Mark as Under Review
                    </div>
                  </SelectItem>
                  <SelectItem value="APPROVED">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Approve
                    </div>
                  </SelectItem>
                  <SelectItem value="REJECTED">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Reject
                    </div>
                  </SelectItem>
                  <SelectItem value="REQUIRES_CHANGES">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      Require Changes
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-notes">Notes (optional)</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add review notes for the SA..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={!reviewStatus || reviewing}
              className="bg-blue-700 hover:bg-blue-800"
            >
              {reviewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="mr-2 h-4 w-4" />
              )}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Transfer Dialog */}
      <AlertDialog open={confirmTransferOpen} onOpenChange={setConfirmTransferOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Office Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              You are approving the transfer of {selectedRenewal?.user.firstName} {selectedRenewal?.user.lastName}
              from {selectedRenewal?.user.profile?.office?.name || "their current office"} to {selectedRenewal?.newOffice?.name}.
              This will update their office assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmTransferOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submitReview(true)}
              className="bg-blue-700 hover:bg-blue-800"
            >
              Confirm Transfer & Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Season Toggle Dialog */}
      <AlertDialog open={seasonToggleOpen} onOpenChange={setSeasonToggleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              {renewalSeasonOpen ? "Close" : "Open"} Renewal Season
            </AlertDialogTitle>
            <AlertDialogDescription>
              {renewalSeasonOpen
                ? "Are you sure you want to close the renewal season? Student Assistants will no longer be able to submit renewal applications."
                : "Are you sure you want to open the renewal season? Student Assistants will be able to submit renewal applications."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setSeasonToggleOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleSeason}
              disabled={togglingSeason}
              className={renewalSeasonOpen ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {togglingSeason ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {renewalSeasonOpen ? "Close Season" : "Open Season"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Renewal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this renewal application? This action cannot be undone.
              {selectedRenewal && (
                <span className="block mt-1 font-medium">
                  {selectedRenewal.user.firstName} {selectedRenewal.user.lastName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedRenewal) return;
                try {
                  const res = await fetch(`/api/renewals/${selectedRenewal.id}`, { method: "DELETE" });
                  if (!res.ok) throw new Error("Failed to delete");
                  toast.success("Renewal deleted");
                  setDeleteOpen(false);
                  setSelectedRenewal(null);
                  fetchRenewals();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete renewal");
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
