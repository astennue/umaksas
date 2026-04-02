"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  MapPin,
  Mail,
  Phone,
  User,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { OfficeDetailModal, type OfficeDetail } from "@/components/offices/office-detail-modal";
import { OfficeFormDialog, type OfficeFormData } from "@/components/offices/office-form-dialog";
import { SARequestFormDialog } from "@/components/offices/sa-request-form-dialog";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";

// =============================================
// Types
// =============================================

interface Office {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  description: string | null;
  headName: string | null;
  headEmail: string | null;
  headUserId: string | null;
  headUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    photoUrl: string | null;
  } | null;
  maxSACount: number;
  currentSACount: number;
  saCount: number;
  requestCount: number;
  isActive: boolean;
  createdAt: string;
}

interface SARequest {
  id: string;
  officeId: string;
  officeName: string;
  officeCode: string | null;
  requestedCount: number;
  reason: string | null;
  requirements: string | null;
  preferredSkills: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

// =============================================
// Status Configs
// =============================================

const requestStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

// =============================================
// Main Page
// =============================================

export default function OfficesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const canCreate = ["SUPER_ADMIN", "ADVISER"].includes(userRole || "");
  const canEdit = ["SUPER_ADMIN", "ADVISER"].includes(userRole || "");
  const canDelete = userRole === "SUPER_ADMIN";
  const canRequestSA = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");
  const canReviewRequest = ["SUPER_ADMIN", "ADVISER"].includes(userRole || "");

  // Office list state
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const limit = 20;

  // Modal states
  const [detailOfficeId, setDetailOfficeId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editOffice, setEditOffice] = useState<OfficeFormData | null>(null);
  const [saRequestOpen, setSaRequestOpen] = useState(false);
  const [saRequestOfficeId, setSaRequestOfficeId] = useState<string | null>(null);
  const [deleteOffice, setDeleteOffice] = useState<Office | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Review dialog
  const [reviewRequest, setReviewRequest] = useState<SARequest | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // SA Requests tab state
  const [saRequests, setSaRequests] = useState<SARequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState("PENDING");
  const [activeTab, setActiveTab] = useState("offices");

  // =============================================
  // Data Fetching
  // =============================================

  const fetchOffices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("isActive", statusFilter);

      const res = await fetch(`/api/offices?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch offices");
      const data = await res.json();
      setOffices(data.offices || []);
      setTotal(data.total || 0);
      setPendingRequests(data.pendingRequests || 0);
    } catch (error) {
      console.error("Error fetching offices:", error);
      toast.error("Failed to load offices");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchSARequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
      });
      if (requestStatusFilter !== "all") {
        params.set("status", requestStatusFilter);
      }

      // Fetch all SA requests by iterating offices
      const res = await fetch(`/api/offices?limit=200`);
      if (!res.ok) return;
      const officesData = await res.json();
      const allRequests: SARequest[] = [];

      for (const office of officesData.offices || []) {
        if (office.requestCount === 0) continue;
        const reqRes = await fetch(
          `/api/offices/${office.id}/sa-requests?${params.toString()}`
        );
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          allRequests.push(...(reqData.saRequests || []));
        }
      }

      allRequests.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSaRequests(allRequests);
    } catch (error) {
      console.error("Error fetching SA requests:", error);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestStatusFilter]);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  useEffect(() => {
    if (activeTab === "sa-requests") {
      fetchSARequests();
    }
  }, [activeTab, fetchSARequests]);

  // =============================================
  // Handlers
  // =============================================

  const handleDelete = async () => {
    if (!deleteOffice) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/offices/${deleteOffice.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to archive office");
      }
      toast.success("Office archived");
      setDeleteOpen(false);
      setDeleteOffice(null);
      fetchOffices();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to archive office");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewRequest) return;
    setIsReviewing(true);
    try {
      const res = await fetch(`/api/offices/sa-requests/${reviewRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          reviewNotes: reviewNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to review request");
      }

      toast.success(
        reviewAction === "APPROVED"
          ? "SA request approved"
          : "SA request rejected"
      );
      setReviewOpen(false);
      setReviewRequest(null);
      setReviewNotes("");
      fetchSARequests();
      fetchOffices();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to review request");
    } finally {
      setIsReviewing(false);
    }
  };

  const openEditFromDetail = (office: OfficeDetail) => {
    setEditOffice({
      id: office.id,
      name: office.name,
      code: office.code || "",
      email: office.email || "",
      phone: office.phone || "",
      location: office.location || "",
      description: office.description || "",
      headUserId: office.headUserId || "",
      maxSACount: office.maxSACount,
      isActive: office.isActive,
    });
    setFormOpen(true);
  };

  // =============================================
  // Computed Values
  // =============================================

  const totalActive = offices.filter((o) => o.isActive).length;
  const totalSAsAssigned = offices.reduce((acc, o) => acc + o.currentSACount, 0);

  // =============================================
  // Loading Skeleton
  // =============================================

  if (loading && offices.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  // =============================================
  // Render
  // =============================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <CRUDToolbar
        title="Offices"
        entityLabel="Offices"
        onAdd={canCreate ? () => { setEditOffice(null); setFormOpen(true); } : undefined}
        onSearch={(value) => { setSearch(value); setPage(1); }}
      >
        {canRequestSA && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSaRequestOfficeId(null);
              setSaRequestOpen(true);
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            SA Request
          </Button>
        )}
      </CRUDToolbar>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="offices" className="gap-2">
            <Building2 className="h-4 w-4" />
            Offices
          </TabsTrigger>
          <TabsTrigger value="sa-requests" className="gap-2">
            <FileText className="h-4 w-4" />
            SA Requests
            {pendingRequests > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0">
                {pendingRequests}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ============================================= */}
        {/* OFFICES TAB */}
        {/* ============================================= */}
        <TabsContent value="offices" className="space-y-6 mt-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Offices", count: total, color: "text-slate-900 dark:text-white", icon: Building2 },
              { label: "Active", count: totalActive, color: "text-green-600", icon: CheckCircle },
              { label: "SAs Assigned", count: totalSAsAssigned, color: "text-blue-600", icon: Users },
              { label: "Pending Requests", count: pendingRequests, color: "text-amber-600", icon: Clock },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-white p-3 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <stat.icon className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search moved to CRUDToolbar */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Archived Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Office Cards Grid */}
          {offices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-sm font-medium text-muted-foreground">No offices found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first office to get started"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {offices.map((office) => {
                const saPercentage = office.maxSACount > 0
                  ? (office.currentSACount / office.maxSACount) * 100
                  : 0;
                const progressColor =
                  saPercentage >= 100
                    ? "bg-red-500"
                    : saPercentage >= 80
                    ? "bg-amber-500"
                    : "bg-green-500";

                return (
                  <Card
                    key={office.id}
                    className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    {/* Status indicator bar */}
                    <div className={`h-1 ${office.isActive ? "bg-[#1e3a8a]" : "bg-slate-300"}`} />

                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">{office.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {office.code && (
                              <Badge
                                variant="secondary"
                                className="bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-mono"
                              >
                                {office.code}
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className={
                                office.isActive
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-xs"
                              }
                            >
                              {office.isActive ? "Active" : "Archived"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="mt-3 space-y-1.5">
                        {office.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{office.location}</span>
                          </div>
                        )}
                        {office.headName && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{office.headName}</span>
                          </div>
                        )}
                        {office.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{office.email}</span>
                          </div>
                        )}
                        {office.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{office.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* SA Capacity */}
                      <div className="mt-3 rounded-md bg-slate-50 p-2 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">SAs</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {office.currentSACount}/{office.maxSACount}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${progressColor}`}
                            style={{ width: `${Math.min(saPercentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-1 border-t pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setDetailOfficeId(office.id);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditOffice({
                                id: office.id,
                                name: office.name,
                                code: office.code || "",
                                email: office.email || "",
                                phone: office.phone || "",
                                location: office.location || "",
                                description: office.description || "",
                                headUserId: office.headUserId || "",
                                maxSACount: office.maxSACount,
                                isActive: office.isActive,
                              });
                              setFormOpen(true);
                            }}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        )}
                        {canRequestSA && office.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSaRequestOfficeId(office.id);
                              setSaRequestOpen(true);
                            }}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            Request
                          </Button>
                        )}
                        {canDelete && office.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700 ml-auto"
                            onClick={() => {
                              setDeleteOffice(office);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

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
        </TabsContent>

        {/* ============================================= */}
        {/* SA REQUESTS TAB */}
        {/* ============================================= */}
        <TabsContent value="sa-requests" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Select
                value={requestStatusFilter}
                onValueChange={setRequestStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSaRequestOfficeId(null);
                  setSaRequestOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {saRequests.length} request{saRequests.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Request List */}
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          ) : saRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-sm font-medium text-muted-foreground">
                No SA requests found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {requestStatusFilter !== "all"
                  ? "Try a different status filter"
                  : "Create your first SA request"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {saRequests.map((req) => {
                const config = requestStatusConfig[req.status] || requestStatusConfig.PENDING;
                return (
                  <Card key={req.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold">
                              {req.officeName}
                              {req.officeCode ? (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                  ({req.officeCode})
                                </span>
                              ) : null}
                            </h3>
                            <Badge className={`${config.color} text-xs`} variant="secondary">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">
                            Requesting <span className="font-semibold">{req.requestedCount}</span> SA
                            {req.requestedCount > 1 ? "s" : ""}
                          </p>
                          {req.reason && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {req.reason}
                            </p>
                          )}
                          {req.requirements && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-medium">Requirements:</span> {req.requirements}
                            </p>
                          )}
                          {req.preferredSkills && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-medium">Skills:</span> {req.preferredSkills}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(req.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {req.reviewNotes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">
                              Review: {req.reviewNotes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        {req.status === "PENDING" && canReviewRequest && (
                          <div className="flex items-center gap-2 shrink-0 sm:mt-0 mt-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                              onClick={() => {
                                setReviewRequest(req);
                                setReviewAction("APPROVED");
                                setReviewNotes("");
                                setReviewOpen(true);
                              }}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs"
                              onClick={() => {
                                setReviewRequest(req);
                                setReviewAction("REJECTED");
                                setReviewNotes("");
                                setReviewOpen(true);
                              }}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ============================================= */}
      {/* MODALS & DIALOGS */}
      {/* ============================================= */}

      {/* Office Detail Modal */}
      <OfficeDetailModal
        officeId={detailOfficeId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={canEdit ? openEditFromDetail : undefined}
      />

      {/* Create/Edit Office Form */}
      <OfficeFormDialog
        office={editOffice}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchOffices}
      />

      {/* SA Request Form */}
      <SARequestFormDialog
        preselectedOfficeId={saRequestOfficeId}
        open={saRequestOpen}
        onOpenChange={setSaRequestOpen}
        onSaved={() => {
          fetchSARequests();
          fetchOffices();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Office</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <strong>{deleteOffice?.name}</strong>?
              This will deactivate the office. It can be reactivated by editing its status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Request Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "APPROVED" ? "Approve" : "Reject"} SA Request
            </DialogTitle>
          </DialogHeader>
          {reviewRequest && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">
                  {reviewRequest.officeName}
                  {reviewRequest.officeCode ? ` (${reviewRequest.officeCode})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Requesting {reviewRequest.requestedCount} SA
                  {reviewRequest.requestedCount > 1 ? "s" : ""}
                </p>
                {reviewRequest.reason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {reviewRequest.reason}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-notes">
                  {reviewAction === "APPROVED" ? "Approval" : "Rejection"} Notes (Optional)
                </Label>
                <Textarea
                  id="review-notes"
                  placeholder={
                    reviewAction === "APPROVED"
                      ? "Add any approval notes..."
                      : "Add a reason for rejection..."
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setReviewOpen(false)}
                  disabled={isReviewing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReview}
                  disabled={isReviewing}
                  className={
                    reviewAction === "APPROVED"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {isReviewing ? (
                    "Processing..."
                  ) : reviewAction === "APPROVED" ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
