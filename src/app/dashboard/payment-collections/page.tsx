"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Separator,
} from "@/components/ui/separator";
import {
  Wallet,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Loader2,
  RefreshCw,
  Pencil,
  X,
  Users,
  CalendarDays,
  Landmark,
  Smartphone,
  CircleDollarSign,
  Archive,
  Ban,
  Ticket,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn, safeJsonParse } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/role-guard";
import { useConfirm } from "@/hooks/use-confirm";
import { EmptyState } from "@/components/ui/empty-state";

// ── Types ───────────────────────────────────────────────────────────

interface CollectionCreator {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface CollectionPaymentUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string;
  photoUrl: string | null;
  role: string;
  profile: {
    college: string | null;
    program: string | null;
    office: {
      name: string;
      code: string | null;
    } | null;
  } | null;
}

interface CollectionPayment {
  id: string;
  collectionId: string;
  userId: string;
  amount: number;
  amountPaid: number | null;
  transactionNumber: string | null;
  proofUrl: string | null;
  uploadedAt: string | null;
  trackingNumber: string | null;
  status: "UNPAID" | "PENDING" | "PAID" | "REJECTED";
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  createdAt: string;
  user: CollectionPaymentUser;
}

interface Collection {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  targetRoles: string;
  allowPartial: boolean;
  paymentMethod: string;
  paymentInstructions: string | null;
  gcashNumber: string | null;
  gcashQrUrl: string | null;
  status: "ACTIVE" | "DRAFT" | "CLOSED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: CollectionCreator;
  _count: {
    collectionPayments: number;
  };
  totalCollected?: number;
  pendingCount?: number;
  paidCount?: number;
  collectionPayments?: CollectionPayment[];
}

interface CollectionStats {
  totalCollections: number;
  activeCollections: number;
  totalCollected: number;
  pendingPayments: number;
}

interface OfficerData {
  position: string;
}

// ── Config ──────────────────────────────────────────────────────────

const collectionStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  DRAFT: { label: "Draft", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: FileText },
  CLOSED: { label: "Closed", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: Archive },
};

const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  PAID: { label: "Paid", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  UNPAID: { label: "Unpaid", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  REJECTED: { label: "Rejected", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: XCircle },
};

function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

function getFullName(user: { firstName: string | null; lastName: string | null; middleName?: string | null; email: string }): string {
  return [user.firstName, user.middleName ? `${user.middleName.charAt(0)}.` : null, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || user.email;
}

function getInitials(user: { firstName: string | null; lastName: string | null }): string {
  return `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM dd, yyyy");
  } catch {
    return "—";
  }
}

function parseTargetRoles(rolesStr: string): string[] {
  try {
    return JSON.parse(rolesStr);
  } catch {
    return ["STUDENT_ASSISTANT"];
  }
}

function targetRolesLabel(rolesStr: string): string {
  const roles = parseTargetRoles(rolesStr);
  const labels: Record<string, string> = {
    STUDENT_ASSISTANT: "Student Assistants",
    OFFICER: "Officers",
  };
  return roles.map((r) => labels[r] || r).join(", ");
}

// ── Form defaults ───────────────────────────────────────────────────

const defaultFormData = {
  title: "",
  description: "",
  amount: 20,
  paymentMethod: "GCASH" as string,
  targetRoles: ["STUDENT_ASSISTANT"] as string[],
  startDate: "",
  endDate: "",
  gcashNumber: "",
  paymentInstructions: "",
};

// ── Component ───────────────────────────────────────────────────────

export default function PaymentCollectionsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const currentUserId = (session?.user as { id?: string })?.id;

  const isAdmin = ["SUPER_ADMIN", "ADVISER"].includes(userRole || "");
  const isOfficer = userRole === "OFFICER";

  const [officer, setOfficer] = useState<OfficerData | null>(null);

  // Data state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<CollectionStats>({ totalCollections: 0, activeCollections: 0, totalCollected: 0, pendingPayments: 0 });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [page, setPage] = useState(1);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCollection, setDetailCollection] = useState<Collection | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Verify dialog
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"verify" | "reject">("verify");
  const [verifyPayment, setVerifyPayment] = useState<CollectionPayment | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const { confirm, ConfirmDialog } = useConfirm();

  // ── Fetch officer profile ──
  const fetchOfficer = useCallback(async () => {
    if (!currentUserId || userRole !== "OFFICER") return;
    try {
      const res = await fetch(`/api/officers/profile?userId=${currentUserId}`);
      if (res.ok) {
        const data = await safeJsonParse<OfficerData>(res);
        setOfficer(data);
      }
    } catch {
      // Ignore
    }
  }, [currentUserId, userRole]);

  // ── Fetch collections ──
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/collections?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch collections");
      const data = await safeJsonParse<{ collections: Collection[]; total: number }>(res);

      setCollections(data.collections || []);
      setTotal(data.total || 0);

      // Compute stats from fetched data
      const allActive = data.collections || [];
      const computedStats: CollectionStats = {
        totalCollections: data.total || 0,
        activeCollections: allActive.filter((c) => c.status === "ACTIVE").length,
        totalCollected: allActive.reduce((sum, c) => sum + (c.totalCollected || 0), 0),
        pendingPayments: allActive.reduce((sum, c) => sum + (c.pendingCount || 0), 0),
      };
      setStats(computedStats);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  // ── Fetch full stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/collections?limit=1000");
      if (!res.ok) return;
      const data = await safeJsonParse<{ collections: Collection[] }>(res);
      const all = data.collections || [];
      setStats({
        totalCollections: all.length,
        activeCollections: all.filter((c) => c.status === "ACTIVE").length,
        totalCollected: all.reduce((sum, c) => sum + (c.totalCollected || 0), 0),
        pendingPayments: all.reduce((sum, c) => sum + (c.pendingCount || 0), 0),
      });
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchOfficer();
  }, [fetchOfficer]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // ── Form handlers ──
  const openCreateForm = () => {
    setEditingCollection(null);
    setFormData(defaultFormData);
    setFormOpen(true);
  };

  const openEditForm = (col: Collection) => {
    setEditingCollection(col);
    setFormData({
      title: col.title,
      description: col.description || "",
      amount: col.amount,
      paymentMethod: col.paymentMethod,
      targetRoles: parseTargetRoles(col.targetRoles),
      startDate: col.startDate ? format(new Date(col.startDate), "yyyy-MM-dd") : "",
      endDate: col.endDate ? format(new Date(col.endDate), "yyyy-MM-dd") : "",
      gcashNumber: col.gcashNumber || "",
      paymentInstructions: col.paymentInstructions || "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (formData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (formData.targetRoles.length === 0) {
      toast.error("At least one target role is required");
      return;
    }
    if ((formData.paymentMethod === "GCASH" || formData.paymentMethod === "BOTH") && !formData.gcashNumber.trim()) {
      toast.error("GCash number is required for this payment method");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingCollection ? `/api/collections/${editingCollection.id}` : "/api/collections";
      const method = editingCollection ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          targetRoles: formData.targetRoles,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          gcashNumber: formData.gcashNumber || null,
          paymentInstructions: formData.paymentInstructions || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save collection");
      }

      toast.success(editingCollection ? "Collection updated successfully" : "Collection created successfully");
      setFormOpen(false);
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save collection");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Generate payments ──
  const handleGeneratePayments = async (col: Collection) => {
    const confirmed = await confirm({
      title: "Generate Payment Records",
      description: `This will create unpaid payment records for all target users in "${col.title}". Users with existing records will be skipped. Continue?`,
      confirmText: "Generate",
    });
    if (!confirmed) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/collections/${col.id}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate payments");
      }
      const data = await safeJsonParse<{ created: number; skipped: number }>(res);
      toast.success(`Generated ${data.created} payment records (${data.skipped} already existed)`);
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate payments");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Close collection ──
  const handleCloseCollection = async (col: Collection) => {
    const confirmed = await confirm({
      title: "Close Collection",
      description: `Are you sure you want to close "${col.title}"? This action cannot be undone. No further payments will be accepted.`,
      confirmText: "Close Collection",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/collections/${col.id}/close`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to close collection");
      }
      toast.success("Collection closed successfully");
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to close collection");
    }
  };

  // ── Activate collection (change status from DRAFT to ACTIVE) ──
  const handleActivateCollection = async (col: Collection) => {
    const confirmed = await confirm({
      title: "Activate Collection",
      description: `Are you sure you want to activate "${col.title}"? It will become visible to target users and payment generation can begin.`,
      confirmText: "Activate",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/collections/${col.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to activate collection");
      }
      toast.success("Collection activated successfully");
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to activate collection");
    }
  };

  // ── View collection detail ──
  const openDetail = async (col: Collection) => {
    setDetailCollection(col);
    setDetailLoading(true);
    setDetailOpen(true);

    try {
      const res = await fetch(`/api/collections/${col.id}`);
      if (!res.ok) throw new Error("Failed to fetch collection details");
      const data = await safeJsonParse<Collection>(res);
      setDetailCollection(data);
    } catch (error) {
      console.error("Error fetching collection detail:", error);
      toast.error("Failed to load collection details");
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Verify payment ──
  const openVerifyDialog = async (payment: CollectionPayment, action: "verify" | "reject") => {
    const confirmed = await confirm({
      title: action === "verify" ? "Approve Payment" : "Reject Payment",
      description: action === "verify"
        ? `Are you sure you want to approve the payment from ${getFullName(payment.user)}?`
        : `Are you sure you want to reject the payment from ${getFullName(payment.user)}?`,
      confirmText: action === "verify" ? "Approve" : "Reject",
      variant: action === "reject" ? "destructive" : "default",
    });
    if (!confirmed) return;

    setVerifyPayment(payment);
    setVerifyAction(action);
    setVerifyNotes("");
    setVerifyOpen(true);
  };

  const handleVerify = async () => {
    if (!verifyPayment || !detailCollection) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/collections/${detailCollection.id}/payments/${verifyPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: verifyAction,
          verificationNotes: verifyNotes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify payment");
      }
      toast.success(verifyAction === "verify" ? "Payment approved successfully" : "Payment rejected");
      setVerifyOpen(false);
      setVerifyPayment(null);
      setVerifyNotes("");

      // Refresh detail
      openDetail(detailCollection);
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to verify payment");
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Role-based verify access ──
  const canVerifyPayments = isAdmin || (isOfficer && (officer?.position === "PRESIDENT" || officer?.position === "TREASURER"));

  // ── Target role checkbox handler ──
  const toggleTargetRole = (role: string) => {
    setFormData((prev) => {
      const roles = prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role];
      return { ...prev, targetRoles: roles };
    });
  };

  // ── Loading skeleton ──
  if (loading && collections.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}>
      <div className="space-y-6">
        <ConfirmDialog />

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Payment Collections
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage organizational fee collections and payment tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchCollections(); fetchStats(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {isAdmin && (
              <Button
                onClick={openCreateForm}
                className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Collection
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Collections", count: stats.totalCollections, color: "text-slate-900 dark:text-white", icon: CreditCard, bg: "bg-slate-50 dark:bg-slate-800" },
            { label: "Active", count: stats.activeCollections, color: "text-green-600", icon: CheckCircle2, bg: "bg-green-50 dark:bg-green-900/10" },
            { label: "Total Collected", count: formatCurrency(stats.totalCollected), color: "text-[#1e3a8a] dark:text-blue-400", icon: CircleDollarSign, bg: "bg-blue-50 dark:bg-blue-900/10" },
            { label: "Pending", count: stats.pendingPayments, color: "text-amber-600", icon: Clock, bg: "bg-amber-50 dark:bg-amber-900/10" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg border p-3 ${stat.bg}`}>
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className={`mt-1 text-xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isAdmin && (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search collections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Collections Table (Desktop) / Cards (Mobile) */}
        {collections.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No collections found"
            description={
              statusFilter !== "all"
                ? "Try adjusting your filters"
                : isAdmin
                  ? "Create a new collection to get started"
                  : "No collections available yet"
            }
            action={isAdmin ? { label: "New Collection", onClick: openCreateForm, variant: "default" } : undefined}
            className="rounded-lg border border-dashed"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border bg-white dark:bg-slate-800 overflow-hidden">
              <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payments</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((col, index) => {
                      const config = collectionStatusConfig[col.status] || collectionStatusConfig.DRAFT;
                      const StatusIcon = config.icon;

                      // Client-side search filter for title
                      if (search && !col.title.toLowerCase().includes(search.toLowerCase())) {
                        return null;
                      }

                      return (
                        <TableRow key={col.id} className="group">
                          <TableCell className="text-xs text-muted-foreground">
                            {(page - 1) * limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[200px]">{col.title}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {col.description || targetRolesLabel(col.targetRoles)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {formatCurrency(col.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {col.paymentMethod === "GCASH" && <Smartphone className="h-3 w-3" />}
                              {col.paymentMethod === "MANUAL" && <Landmark className="h-3 w-3" />}
                              {(col.paymentMethod === "BOTH") && <Wallet className="h-3 w-3" />}
                              <span>{col.paymentMethod}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${config.color} gap-1`} variant="secondary">
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{col._count?.collectionPayments || 0}</span>
                              {(col.pendingCount || 0) > 0 && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0 ml-1" variant="secondary">
                                  {col.pendingCount} pending
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-green-600">
                            {formatCurrency(col.totalCollected || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(col.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => openDetail(col)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                View
                              </Button>
                              {col.status === "ACTIVE" && isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-[#1e3a8a] hover:text-[#1e3a8a]/80 hover:bg-blue-50"
                                  onClick={() => handleGeneratePayments(col)}
                                  disabled={isGenerating}
                                >
                                  {isGenerating ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Users className="mr-1 h-3 w-3" />
                                  )}
                                  Generate
                                </Button>
                              )}
                              {(col.status === "DRAFT" || col.status === "ACTIVE") && isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => openEditForm(col)}
                                >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                              )}
                              {col.status === "ACTIVE" && isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleCloseCollection(col)}
                                >
                                  <Ban className="mr-1 h-3 w-3" />
                                  Close
                                </Button>
                              )}
                              {col.status === "DRAFT" && isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleActivateCollection(col)}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Activate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {collections.map((col) => {
                const config = collectionStatusConfig[col.status] || collectionStatusConfig.DRAFT;
                const StatusIcon = config.icon;

                if (search && !col.title.toLowerCase().includes(search.toLowerCase())) {
                  return null;
                }

                return (
                  <Card key={col.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold truncate">{col.title}</h3>
                            <Badge className={`${config.color} gap-1 shrink-0`} variant="secondary">
                              <StatusIcon className="h-2.5 w-2.5" />
                              {config.label}
                            </Badge>
                          </div>
                          {col.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{col.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Amount:</span>{" "}
                              <span className="font-medium">{formatCurrency(col.amount)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Method:</span>{" "}
                              <span className="font-medium">{col.paymentMethod}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Payments:</span>{" "}
                              <span className="font-medium">{col._count?.collectionPayments || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Collected:</span>{" "}
                              <span className="font-medium text-green-600">{formatCurrency(col.totalCollected || 0)}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Created {formatDate(col.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openDetail(col)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        {col.status === "ACTIVE" && isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#1e3a8a]"
                            onClick={() => handleGeneratePayments(col)}
                            disabled={isGenerating}
                          >
                            <Users className="mr-1 h-3 w-3" />
                            Generate
                          </Button>
                        )}
                        {(col.status === "DRAFT" || col.status === "ACTIVE") && isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openEditForm(col)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        )}
                        {col.status === "ACTIVE" && isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600"
                            onClick={() => handleCloseCollection(col)}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Close
                          </Button>
                        )}
                        {col.status === "DRAFT" && isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-green-600"
                            onClick={() => handleActivateCollection(col)}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Create/Edit Collection Dialog ── */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCollection ? "Edit Collection" : "New Collection"}</DialogTitle>
              <DialogDescription>
                {editingCollection
                  ? "Update the collection details below."
                  : "Create a new payment collection for organizational fees."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="col-title">Title *</Label>
                <Input
                  id="col-title"
                  placeholder="e.g., Monthly SAS Fee - October 2024"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="col-desc">Description</Label>
                <Textarea
                  id="col-desc"
                  placeholder="Brief description of this collection..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="col-amount">Amount (₱) *</Label>
                <Input
                  id="col-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, paymentMethod: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GCASH">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5" />
                        GCash Only
                      </div>
                    </SelectItem>
                    <SelectItem value="MANUAL">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-3.5 w-3.5" />
                        Manual (In-Person)
                      </div>
                    </SelectItem>
                    <SelectItem value="BOTH">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5" />
                        Both GCash & Manual
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* GCash Number */}
              {(formData.paymentMethod === "GCASH" || formData.paymentMethod === "BOTH") && (
                <div className="space-y-2">
                  <Label htmlFor="col-gcash">GCash Number</Label>
                  <Input
                    id="col-gcash"
                    placeholder="e.g., 0917-123-4567"
                    value={formData.gcashNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gcashNumber: e.target.value }))}
                  />
                </div>
              )}

              {/* Target Roles */}
              <div className="space-y-2">
                <Label>Target Roles</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="role-sa"
                      checked={formData.targetRoles.includes("STUDENT_ASSISTANT")}
                      onCheckedChange={() => toggleTargetRole("STUDENT_ASSISTANT")}
                    />
                    <Label htmlFor="role-sa" className="text-sm font-normal cursor-pointer">
                      Student Assistants
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="role-officer"
                      checked={formData.targetRoles.includes("OFFICER")}
                      onCheckedChange={() => toggleTargetRole("OFFICER")}
                    />
                    <Label htmlFor="role-officer" className="text-sm font-normal cursor-pointer">
                      Officers
                    </Label>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="col-start">Start Date</Label>
                  <Input
                    id="col-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="col-end">End Date</Label>
                  <Input
                    id="col-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="space-y-2">
                <Label htmlFor="col-instructions">Payment Instructions</Label>
                <Textarea
                  id="col-instructions"
                  placeholder="Instructions for payment submission..."
                  value={formData.paymentInstructions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentInstructions: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleFormSubmit}
                disabled={isSaving}
                className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCollection ? "Update Collection" : "Create Collection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Collection Detail Dialog ── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {detailCollection?.title || "Collection Details"}
                {detailCollection && (
                  <Badge
                    className={`${(collectionStatusConfig[detailCollection.status] || collectionStatusConfig.DRAFT).color} gap-1`}
                    variant="secondary"
                  >
                    {(() => {
                      const config = collectionStatusConfig[detailCollection.status];
                      const Icon = config.icon;
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {(collectionStatusConfig[detailCollection.status] || collectionStatusConfig.DRAFT).label}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Collection details and payment records
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : detailCollection ? (
              <div className="space-y-4">
                {/* Collection Info */}
                <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                  <h4 className="text-sm font-semibold mb-3">Collection Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Description</span>
                      <p className="mt-0.5">{detailCollection.description || "No description"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <p className="mt-0.5 font-semibold">{formatCurrency(detailCollection.amount)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Payment Method</span>
                      <p className="mt-0.5">{detailCollection.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Target</span>
                      <p className="mt-0.5">{targetRolesLabel(detailCollection.targetRoles)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Start Date</span>
                      <p className="mt-0.5">{formatDate(detailCollection.startDate)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">End Date</span>
                      <p className="mt-0.5">{formatDate(detailCollection.endDate)}</p>
                    </div>
                    {detailCollection.gcashNumber && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">GCash Number</span>
                        <p className="mt-0.5 font-medium">{detailCollection.gcashNumber}</p>
                      </div>
                    )}
                    {detailCollection.paymentInstructions && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">Payment Instructions</span>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs">{detailCollection.paymentInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-900/10 text-center">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-lg font-bold text-green-600">{detailCollection.paidCount || 0}</p>
                    <p className="text-xs text-green-600">{formatCurrency(detailCollection.totalCollected || 0)}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-900/10 text-center">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold text-amber-600">{detailCollection.pendingCount || 0}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-800 text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {detailCollection.collectionPayments?.length || detailCollection._count?.collectionPayments || 0}
                    </p>
                  </div>
                </div>

                {/* Payment Records */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Payment Records</h4>
                  {!detailCollection.collectionPayments || detailCollection.collectionPayments.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                      <p className="text-sm text-muted-foreground">No payment records yet</p>
                      {isAdmin && detailCollection.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          className="mt-3 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                          onClick={() => handleGeneratePayments(detailCollection)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Users className="mr-2 h-4 w-4" />
                          )}
                          Generate Payments
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                            <TableHead>User</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Tracking #</TableHead>
                            {canVerifyPayments && (
                              <TableHead className="text-right">Actions</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailCollection.collectionPayments.map((payment) => {
                            const pConfig = paymentStatusConfig[payment.status] || paymentStatusConfig.UNPAID;
                            const PIcon = pConfig.icon;
                            return (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-[10px] font-semibold">
                                      {getInitials(payment.user)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate max-w-[150px]">
                                        {getFullName(payment.user)}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                        {payment.user.email}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${pConfig.color} gap-1 text-[10px]`} variant="secondary">
                                    <PIcon className="h-2.5 w-2.5" />
                                    {pConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-xs font-medium">
                                  {payment.status === "PAID" && payment.amountPaid
                                    ? formatCurrency(payment.amountPaid)
                                    : formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Ticket className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[100px] font-mono">
                                      {payment.trackingNumber || "—"}
                                    </span>
                                  </div>
                                </TableCell>
                                {canVerifyPayments && (
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      {payment.status === "PENDING" && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-50 px-2"
                                            onClick={() => openVerifyDialog(payment, "verify")}
                                          >
                                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                                            Verify
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                            onClick={() => openVerifyDialog(payment, "reject")}
                                          >
                                            <XCircle className="mr-1 h-2.5 w-2.5" />
                                            Reject
                                          </Button>
                                        </>
                                      )}
                                      {payment.verificationNotes && (
                                        <span className="text-[10px] text-muted-foreground italic max-w-[100px] truncate" title={payment.verificationNotes}>
                                          {payment.verificationNotes}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Verify Dialog ── */}
        <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {verifyAction === "verify" ? "Approve Payment" : "Reject Payment"}
              </DialogTitle>
              <DialogDescription>
                {verifyPayment
                  ? `${verifyAction === "verify" ? "Approve" : "Reject"} payment from ${getFullName(verifyPayment.user)} for ${formatCurrency(verifyPayment.amount)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="verify-notes">Notes (optional)</Label>
                <Textarea
                  id="verify-notes"
                  placeholder={verifyAction === "verify" ? "Any notes for approval..." : "Reason for rejection..."}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerifyOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleVerify}
                disabled={isVerifying}
                className={
                  verifyAction === "verify"
                    ? "bg-green-600 hover:bg-green-600/90"
                    : "bg-red-600 hover:bg-red-600/90"
                }
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {verifyAction === "verify" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
