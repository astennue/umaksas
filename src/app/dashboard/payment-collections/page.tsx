"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  Trash2,
  FileText,
  ImageIcon,
  Copy,
  Check,
  QrCode,
  Banknote,
  Award,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Upload,
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
    office: { name: string; code: string | null } | null;
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
  _count: { collectionPayments: number };
  totalCollected?: number;
  pendingCount?: number;
  paidCount?: number;
  unpaidCount?: number;
  collectionPayments?: CollectionPayment[];
}

interface MyPaymentWithCollection extends CollectionPayment {
  collection: {
    id: string;
    title: string;
    description: string | null;
    amount: number;
    paymentMethod: string;
    gcashNumber: string | null;
    gcashQrUrl: string | null;
    paymentInstructions: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
}

interface CollectionStats {
  totalCollections: number;
  activeCollections: number;
  draftCollections: number;
  closedCollections: number;
  totalCollected: number;
}

interface MyPaymentStats {
  total: number;
  paid: number;
  pending: number;
  unpaid: number;
  rejected: number;
}

interface OfficerData {
  position: string;
}

interface SearchableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  college: string | null;
}

interface TargetRolesParsed {
  mode: string;
  userIds?: string[];
  legacyRoles?: string[];
}

// ── Config ──────────────────────────────────────────────────────────

const TARGET_OPTIONS = [
  { value: "ALL_SAS", label: "All Student Assistants" },
  { value: "ALL_OFFICERS", label: "All Officers including Adviser/s" },
  { value: "ALL", label: "All (SAs + Officers + Advisers)" },
  { value: "INDIVIDUAL", label: "Per Individual Selection" },
];

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
    .filter(Boolean).join(" ").trim() || user.email;
}

function getInitials(user: { firstName: string | null; lastName: string | null }): string {
  return `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try { return format(new Date(dateStr), "MMM dd, yyyy"); } catch { return "—"; }
}

function formatDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  try { return format(new Date(dateStr), "yyyy-MM-dd"); } catch { return ""; }
}

function parseTargetRoles(rolesStr: string): TargetRolesParsed {
  try {
    const parsed = JSON.parse(rolesStr);
    if (Array.isArray(parsed)) return { mode: "LEGACY", legacyRoles: parsed };
    return parsed;
  } catch { return { mode: "LEGACY", legacyRoles: ["STUDENT_ASSISTANT"] }; }
}

function targetLabel(rolesStr: string): string {
  const parsed = parseTargetRoles(rolesStr);
  const found = TARGET_OPTIONS.find((t) => t.value === parsed.mode);
  if (found) return found.label;
  if (parsed.mode === "LEGACY" && parsed.legacyRoles) {
    const labels: Record<string, string> = { STUDENT_ASSISTANT: "Student Assistants", OFFICER: "Officers", ADVISER: "Advisers" };
    return parsed.legacyRoles.map((r) => labels[r] || r).join(", ");
  }
  if (parsed.mode === "INDIVIDUAL") {
    return `${(parsed.userIds?.length || 0)} individual(s) selected`;
  }
  return parsed.mode;
}

// ── Form defaults ───────────────────────────────────────────────────

const defaultFormData = {
  title: "",
  description: "",
  amount: 20,
  deadline: "",
  target: "ALL_SAS" as string,
  individualUserIds: [] as string[],
  paymentMethod: "GCASH" as string,
  gcashNumber: "",
  gcashQrUrl: "",
  paymentInstructions: "",
};

// ── Component ───────────────────────────────────────────────────────

export default function PaymentCollectionsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const currentUserId = (session?.user as { id?: string })?.id;

  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdviser = userRole === "ADVISER";
  const isOfficer = userRole === "OFFICER";

  const [officer, setOfficer] = useState<OfficerData | null>(null);
  const [officerLoading, setOfficerLoading] = useState(true);

  const isPresident = isOfficer && officer?.position === "PRESIDENT";
  const isTreasurer = isOfficer && officer?.position === "TREASURER";
  const isLeadershipOfficer = isPresident || isTreasurer;
  const isViewOnlyOfficer = isOfficer && !isLeadershipOfficer;

  // Admin = SUPER_ADMIN or ADVISER
  const isAdmin = isSuperAdmin || isAdviser;
  // Can manage CRUD = SUPER_ADMIN, ADVISER, or PRESIDENT/TREASURER officers
  const canManage = isAdmin || isLeadershipOfficer;
  // Can verify payments = SUPER_ADMIN, ADVISER, PRESIDENT, TREASURER
  const canVerifyPayments = canManage;
  // Show "My Payments" tab = officers who are NOT advisers and NOT super admin
  const showMyPaymentsTab = isOfficer;

  // ── Officer fetch ──
  const fetchOfficer = useCallback(async () => {
    if (!currentUserId || userRole !== "OFFICER") {
      setOfficerLoading(false);
      return;
    }
    try {
      setOfficerLoading(true);
      const res = await fetch(`/api/officers/profile?userId=${currentUserId}`);
      if (res.ok) {
        const data = await safeJsonParse<OfficerData>(res);
        setOfficer(data);
      }
    } catch { /* ignore */ } finally { setOfficerLoading(false); }
  }, [currentUserId, userRole]);

  useEffect(() => { fetchOfficer(); }, [fetchOfficer]);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState("collections");

  // ============ COLLECTIONS TAB STATE ============

  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<CollectionStats>({ totalCollections: 0, activeCollections: 0, draftCollections: 0, closedCollections: 0, totalCollected: 0 });
  const [colLoading, setColLoading] = useState(true);
  const [colTotal, setColTotal] = useState(0);
  const colLimit = 20;
  const [colPage, setColPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  // QR upload states
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrUploading, setQrUploading] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCollection, setDetailCollection] = useState<Collection | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verify dialog
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"verify" | "reject">("verify");
  const [verifyPayment, setVerifyPayment] = useState<CollectionPayment | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Proof image dialog
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState("");

  // User search for individual target
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<SearchableUser[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const userSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Payment filter in detail
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const { confirm, ConfirmDialog } = useConfirm();

  // ── Fetch collections ──
  const fetchCollections = useCallback(async () => {
    try {
      setColLoading(true);
      const params = new URLSearchParams({ page: colPage.toString(), limit: colLimit.toString() });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/collections?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch collections");
      const data = await safeJsonParse<{ collections: Collection[]; total: number }>(res);
      setCollections(data.collections || []);
      setColTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to load collections");
    } finally { setColLoading(false); }
  }, [colPage, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/collections?limit=1000");
      if (!res.ok) return;
      const data = await safeJsonParse<{ collections: Collection[] }>(res);
      const all = data.collections || [];
      setStats({
        totalCollections: all.length,
        activeCollections: all.filter((c) => c.status === "ACTIVE").length,
        draftCollections: all.filter((c) => c.status === "DRAFT").length,
        closedCollections: all.filter((c) => c.status === "CLOSED").length,
        totalCollected: all.reduce((sum, c) => sum + (c.totalCollected || 0), 0),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setColPage(1); }, [statusFilter]);

  // ============ MY PAYMENTS TAB STATE ============

  const [myPayments, setMyPayments] = useState<MyPaymentWithCollection[]>([]);
  const [myStats, setMyStats] = useState<MyPaymentStats>({ total: 0, paid: 0, pending: 0, unpaid: 0, rejected: 0 });
  const [myLoading, setMyLoading] = useState(false);
  const [myStatusFilter, setMyStatusFilter] = useState("all");

  // Pay dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payPayment, setPayPayment] = useState<MyPaymentWithCollection | null>(null);
  const [payTxNumber, setPayTxNumber] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payConfirm, setPayConfirm] = useState(false);
  const [paySelectedFile, setPaySelectedFile] = useState<File | null>(null);
  const [payFilePreview, setPayFilePreview] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Proof view dialog for my payments
  const [myProofOpen, setMyProofOpen] = useState(false);
  const [myProofUrl, setMyProofUrl] = useState("");
  const [copiedGcash, setCopiedGcash] = useState(false);

  const payFileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch my payments ──
  const fetchMyPayments = useCallback(async () => {
    if (!showMyPaymentsTab) return;
    try {
      setMyLoading(true);
      const res = await fetch("/api/collections/my-payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await safeJsonParse<{ payments: MyPaymentWithCollection[]; stats: MyPaymentStats }>(res);
      setMyPayments(data.payments || []);
      setMyStats(data.stats || { total: 0, paid: 0, pending: 0, unpaid: 0, rejected: 0 });
    } catch (error) {
      console.error("Error fetching my payments:", error);
      toast.error("Failed to load your payments");
    } finally { setMyLoading(false); }
  }, [showMyPaymentsTab]);

  useEffect(() => {
    if (activeTab === "my-payments") fetchMyPayments();
  }, [activeTab, fetchMyPayments]);

  // ── User search (for INDIVIDUAL target) ──
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      setUserSearchLoading(true);
      const res = await fetch(`/api/student-assistants?search=${encodeURIComponent(query)}&limit=20`);
      if (!res.ok) return;
      const data = await safeJsonParse<{ profiles: Array<{ user: { id: string; firstName: string | null; lastName: string | null; email: string; role: string }; college: string | null }> }>(res);
      const results: SearchableUser[] = (data.profiles || []).map((p) => ({
        id: p.user.id,
        name: [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || p.user.email,
        email: p.user.email,
        role: p.user.role,
        college: p.college,
      }));
      // Also search officers
      const res2 = await fetch(`/api/officers?search=${encodeURIComponent(query)}&limit=20`);
      if (res2.ok) {
        const data2 = await safeJsonParse<{ officers: Array<{ userId: string; user: { id: string; firstName: string | null; lastName: string | null; email: string }; position: string; college: string | null }> }>(res2);
        const officerResults: SearchableUser[] = (data2.officers || []).map((o) => ({
          id: o.userId || o.user.id,
          name: [o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || o.user.email,
          email: o.user.email,
          role: "OFFICER",
          college: o.college,
        }));
        // Merge and deduplicate
        const allIds = new Set(results.map((r) => r.id));
        for (const r of officerResults) {
          if (!allIds.has(r.id)) results.push(r);
        }
      }
      setUserSearchResults(results);
    } catch { /* ignore */ } finally { setUserSearchLoading(false); }
  }, []);

  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value);
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    userSearchTimeout.current = setTimeout(() => searchUsers(value), 300);
  };

  const toggleIndividualUser = (userId: string) => {
    setFormData((prev) => {
      const ids = prev.individualUserIds.includes(userId)
        ? prev.individualUserIds.filter((id) => id !== userId)
        : [...prev.individualUserIds, userId];
      return { ...prev, individualUserIds: ids };
    });
  };

  // ── QR file upload handler ──
  const handleQrFileSelect = async (file: File | undefined) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, WebP, and GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setQrPreview(localUrl);
    setQrUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "photo");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const data = await res.json();
      setQrPreview(data.url);
      setFormData((p) => ({ ...p, gcashQrUrl: data.url }));
      toast.success("QR code uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload QR code");
      setQrPreview(null);
      setFormData((p) => ({ ...p, gcashQrUrl: "" }));
    } finally {
      setQrUploading(false);
      if (qrInputRef.current) qrInputRef.current.value = "";
      URL.revokeObjectURL(localUrl);
    }
  };

  // ── Form handlers ──
  const openCreateForm = () => {
    setEditingCollection(null);
    setFormData(defaultFormData);
    setQrPreview(null);
    setQrUploading(false);
    setFormOpen(true);
  };

  const openEditForm = (col: Collection) => {
    const parsed = parseTargetRoles(col.targetRoles);
    setEditingCollection(col);
    setFormData({
      title: col.title,
      description: col.description || "",
      amount: col.amount,
      deadline: formatDateInput(col.endDate),
      target: parsed.mode === "LEGACY" ? "ALL_SAS" : parsed.mode,
      individualUserIds: parsed.userIds || [],
      paymentMethod: col.paymentMethod,
      gcashNumber: col.gcashNumber || "",
      gcashQrUrl: col.gcashQrUrl || "",
      paymentInstructions: col.paymentInstructions || "",
    });
    setQrPreview(col.gcashQrUrl || null);
    setQrUploading(false);
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.title.trim()) { toast.error("Title is required"); return; }
    if (formData.amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (!formData.deadline) { toast.error("Deadline is required"); return; }
    if ((formData.paymentMethod === "GCASH" || formData.paymentMethod === "BOTH") && !formData.gcashNumber.trim()) {
      toast.error("GCash number is required for this payment method");
      return;
    }
    if (formData.target === "INDIVIDUAL" && formData.individualUserIds.length === 0) {
      toast.error("Please select at least one individual");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingCollection ? `/api/collections/${editingCollection.id}` : "/api/collections";
      const method = editingCollection ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        amount: formData.amount,
        deadline: formData.deadline,
        target: formData.target,
        paymentMethod: formData.paymentMethod,
        gcashNumber: formData.gcashNumber || null,
        gcashQrUrl: formData.gcashQrUrl || null,
        paymentInstructions: formData.paymentInstructions || null,
      };
      if (formData.target === "INDIVIDUAL") {
        body.individualUserIds = formData.individualUserIds;
      }

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save collection");
      }
      toast.success(editingCollection ? "Collection updated" : "Collection created");
      setFormOpen(false);
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save collection");
    } finally { setIsSaving(false); }
  };

  // ── Delete collection ──
  const handleDeleteCollection = async (col: Collection) => {
    const paymentCount = col._count?.collectionPayments || 0;
    const confirmed = await confirm({
      title: "Delete Collection",
      description: paymentCount > 0
        ? `Are you sure you want to permanently delete "${col.title}"? This will also delete ${paymentCount} payment record(s) associated with this collection. This action CANNOT be undone.`
        : `Are you sure you want to delete "${col.title}"? This action CANNOT be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${col.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete collection");
      }
      toast.success("Collection deleted");
      fetchCollections();
      fetchStats();
      if (detailOpen) setDetailOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete collection");
    } finally { setIsDeleting(false); }
  };

  // ── Activate collection ──
  const handleActivateCollection = async (col: Collection) => {
    const confirmed = await confirm({
      title: "Activate Collection",
      description: `Activate "${col.title}"? This will make it visible to target users and auto-generate payment records for all target users.`,
      confirmText: "Activate",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/collections/${col.id}/activate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to activate collection");
      }
      const data = await safeJsonParse<{ paymentsGenerated: number; skipped: number }>(res);
      toast.success(`Collection activated! ${data.paymentsGenerated} payment records created`);
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to activate collection");
    }
  };

  // ── Close collection ──
  const handleCloseCollection = async (col: Collection) => {
    const confirmed = await confirm({
      title: "Close Collection",
      description: `Close "${col.title}"? No further payments will be accepted for this collection.`,
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
      toast.success("Collection closed");
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to close collection");
    }
  };

  // ── View collection detail ──
  const openDetail = async (col: Collection) => {
    setDetailCollection(col);
    setDetailLoading(true);
    setPaymentStatusFilter("all");
    setDetailOpen(true);
    try {
      const res = await fetch(`/api/collections/${col.id}`);
      if (!res.ok) throw new Error("Failed to fetch collection details");
      const data = await safeJsonParse<Collection>(res);
      setDetailCollection(data);
    } catch (error) {
      console.error("Error fetching collection detail:", error);
      toast.error("Failed to load collection details");
    } finally { setDetailLoading(false); }
  };

  // ── Verify payment ──
  const openVerifyDialog = async (payment: CollectionPayment, action: "verify" | "reject") => {
    const confirmed = await confirm({
      title: action === "verify" ? "Approve Payment" : "Reject Payment",
      description: action === "verify"
        ? `Approve the payment from ${getFullName(payment.user)} (${formatCurrency(payment.amountPaid || payment.amount)})?`
        : `Reject the payment from ${getFullName(payment.user)}? They will need to re-submit.`,
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
        body: JSON.stringify({ action: verifyAction, verificationNotes: verifyNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify payment");
      }
      toast.success(verifyAction === "verify" ? "Payment approved" : "Payment rejected");
      setVerifyOpen(false);
      openDetail(detailCollection);
      fetchCollections();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to verify payment");
    } finally { setIsVerifying(false); }
  };

  // ── Copy GCash number ──
  const copyGcash = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedGcash(true);
    toast.success("GCash number copied");
    setTimeout(() => setCopiedGcash(false), 2000);
  };

  // ── Pay Now handlers ──
  const openPayDialog = (payment: MyPaymentWithCollection) => {
    if (payment.collection.status !== "ACTIVE") return;
    setPayPayment(payment);
    setPayAmount(payment.amount.toString());
    setPayTxNumber("");
    setPayConfirm(false);
    setPaySelectedFile(null);
    setPayFilePreview(null);
    setPayOpen(true);
  };

  const handlePayFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Only JPG, PNG, WebP images"); return; }
    setPaySelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPayFilePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaySubmit = async () => {
    if (!payPayment || !paySelectedFile) return;
    if (!payTxNumber.trim()) { toast.error("Enter transaction number"); return; }
    if (!payAmount || parseFloat(payAmount) <= 0) { toast.error("Enter valid amount"); return; }
    if (!payConfirm) { toast.error("Please confirm the authenticity"); return; }

    setIsSubmittingPayment(true);
    try {
      // Upload receipt
      setIsUploading(true);
      const formDataUpload = new FormData();
      formDataUpload.append("file", paySelectedFile);
      formDataUpload.append("type", "photo");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formDataUpload });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
      setIsUploading(false);

      // Submit payment proof
      const submitRes = await fetch("/api/collections/my-payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payPayment.id,
          transactionNumber: payTxNumber.trim(),
          amountPaid: parseFloat(payAmount),
          proofUrl: uploadData.url,
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Submission failed");

      toast.success("Payment submitted! Please wait for verification.");
      setPayOpen(false);
      fetchMyPayments();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to submit payment");
    } finally { setIsSubmittingPayment(false); setIsUploading(false); }
  };

  // ── Filter helpers ──
  const filteredCollections = collections.filter((c) => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredMyPayments = myPayments.filter((p) => {
    if (myStatusFilter === "all") return true;
    return p.status === myStatusFilter;
  });

  // ── Loading skeleton ──
  if (officerLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />)}
        </div>
      </div>
    );
  }

  if (colLoading && collections.length === 0 && !showMyPaymentsTab) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />)}
        </div>
        <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />)}</div>
      </div>
    );
  }

  const colTotalPages = Math.ceil(colTotal / colLimit);

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}>
      <div className="space-y-6">
        <ConfirmDialog />

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Payment Collections
              {isOfficer && officer && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-400/30">
                  <Award className="w-3 h-3 mr-1" />
                  UMAK SAS Officer — {officer.position.replace(/_/g, " ")}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Create and manage payment collections, verify submissions"
                : isViewOnlyOfficer
                  ? "View collections and manage your own payments"
                  : "Manage organizational fee collections"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchCollections(); fetchStats(); if (showMyPaymentsTab) fetchMyPayments(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {canManage && (
              <Button onClick={openCreateForm} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
                <Plus className="mr-2 h-4 w-4" />
                New Collection
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {showMyPaymentsTab && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="collections" className="gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Collections
              </TabsTrigger>
              <TabsTrigger value="my-payments" className="gap-1.5">
                <Banknote className="h-3.5 w-3.5" />
                My Payments
                {myStats.unpaid > 0 && (
                  <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0" variant="secondary">{myStats.unpaid}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collections" className="mt-4">
              <CollectionsTab />
            </TabsContent>
            <TabsContent value="my-payments" className="mt-4">
              <MyPaymentsTab />
            </TabsContent>
          </Tabs>
        )}

        {!showMyPaymentsTab && <CollectionsTab />}

        {/* ═══════════ CREATE/EDIT DIALOG ═══════════ */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCollection ? "Edit Collection" : "New Collection"}</DialogTitle>
              <DialogDescription>
                {editingCollection ? "Update collection details." : "Create a new payment collection."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="col-title">Title *</Label>
                <Input id="col-title" placeholder="e.g., Monthly SAS Fee - October 2024" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="col-desc">Description</Label>
                <Textarea id="col-desc" placeholder="Brief description..." value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="col-amount">Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                    <Input id="col-amount" type="number" min="0" step="0.01" className="pl-7" value={formData.amount} onChange={(e) => setFormData((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="col-deadline">Deadline *</Label>
                  <Input id="col-deadline" type="date" value={formData.deadline} onChange={(e) => setFormData((p) => ({ ...p, deadline: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target *</Label>
                <Select value={formData.target} onValueChange={(v) => setFormData((p) => ({ ...p, target: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {formData.target === "INDIVIDUAL" && (
                <div className="space-y-2">
                  <Label>Select Users *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search by name or email..." className="pl-9" value={userSearchQuery} onChange={(e) => handleUserSearchChange(e.target.value)} />
                  </div>
                  {formData.individualUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.individualUserIds.map((id) => {
                        const sel = userSearchResults.find((u) => u.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1">
                            {sel?.name || id.slice(0, 8)}
                            <button onClick={() => toggleIndividualUser(id)} className="ml-0.5 hover:text-red-600"><X className="h-3 w-3" /></button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  {userSearchLoading && <p className="text-xs text-muted-foreground">Searching...</p>}
                  {userSearchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded border bg-slate-50 dark:bg-slate-900 mt-1">
                      {userSearchResults
                        .filter((u) => !formData.individualUserIds.includes(u.id))
                        .slice(0, 10)
                        .map((u) => (
                          <button key={u.id} type="button" onClick={() => toggleIndividualUser(u.id)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-[10px] font-semibold">{getInitials({ firstName: u.name.split(" ")[0], lastName: u.name.split(" ").slice(-1)[0] })}</div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{u.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.email} {u.college ? `• ${u.college}` : ""}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">{u.role === "OFFICER" ? "Officer" : "SA"}</Badge>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={formData.paymentMethod} onValueChange={(v) => setFormData((p) => ({ ...p, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GCASH">GCash</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="BOTH">GCash + Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.paymentMethod === "GCASH" || formData.paymentMethod === "BOTH") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="col-gcash">GCash Number *</Label>
                    <Input id="col-gcash" placeholder="e.g., 09123456789" value={formData.gcashNumber} onChange={(e) => setFormData((p) => ({ ...p, gcashNumber: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>GCash QR Code</Label>
                    {qrPreview ? (
                      <div className="relative group rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-800/50">
                          <img src={qrPreview} alt="GCash QR Code" className="h-40 w-40 object-contain rounded" />
                        </div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 rounded-full shadow-md"
                            onClick={() => {
                              setQrPreview(null);
                              setFormData((p) => ({ ...p, gcashQrUrl: "" }));
                              if (qrInputRef.current) qrInputRef.current.value = "";
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {qrUploading && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-[#1e3a8a]" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 p-6 cursor-pointer hover:border-[#1e3a8a]/40 hover:bg-blue-50/50 dark:hover:border-blue-500/40 dark:hover:bg-blue-900/10 transition-colors"
                        onClick={() => qrInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleQrFileSelect(e.dataTransfer.files[0]); }}
                      >
                        {qrUploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a]" />
                        ) : (
                          <QrCode className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        )}
                        <div className="text-center">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {qrUploading ? "Uploading..." : "Click to upload or drag and drop"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP, GIF (max 5MB)</p>
                        </div>
                        <input
                          ref={qrInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleQrFileSelect(file);
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="col-instructions">Payment Instructions</Label>
                    <Textarea id="col-instructions" placeholder="1. Open GCash app&#10;2. Send to the number above&#10;3. Screenshot the receipt" value={formData.paymentInstructions} onChange={(e) => setFormData((p) => ({ ...p, paymentInstructions: e.target.value }))} rows={3} />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleFormSubmit} disabled={isSaving} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingCollection ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════ DETAIL DIALOG ═══════════ */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {detailCollection?.title}
                {detailCollection && (
                  <Badge className={cn(collectionStatusConfig[detailCollection.status]?.color, "gap-1")} variant="secondary">
                    {(() => { const c = collectionStatusConfig[detailCollection.status]; return c ? <c.icon className="h-3 w-3" /> : null; })()}
                    {collectionStatusConfig[detailCollection.status]?.label}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>{detailCollection?.description || "Collection details and payment records"}</DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />)}
              </div>
            ) : detailCollection ? (
              <div className="space-y-4">
                {/* Collection Info */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/30">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(detailCollection.amount)}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/30">
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{targetLabel(detailCollection.targetRoles)}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-900/10">
                    <p className="text-xs text-muted-foreground">Collected</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(detailCollection.totalCollected || 0)}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-900/10">
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(detailCollection.endDate)}</p>
                  </div>
                </div>

                {/* Payment stats */}
                <div className="flex gap-3 text-xs">
                  <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />{detailCollection.paidCount || 0} Paid</Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />{detailCollection.pendingCount || 0} Pending</Badge>
                  <Badge variant="secondary" className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1" />{detailCollection.unpaidCount || 0} Unpaid</Badge>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600"><Users className="h-3 w-3 mr-1" />{(detailCollection._count?.collectionPayments || 0)} Total</Badge>
                </div>

                {/* GCash Info */}
                {(detailCollection.gcashNumber || detailCollection.gcashQrUrl) && (
                  <Card className="border-[#004EE0]/20 bg-[#004EE0]/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="h-4 w-4 text-[#004EE0]" />
                        <p className="text-sm font-semibold text-[#004EE0]">GCash Payment Info</p>
                      </div>
                      <div className="flex flex-wrap gap-4 items-center">
                        {detailCollection.gcashQrUrl && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden border bg-white">
                            <img src={detailCollection.gcashQrUrl} alt="GCash QR" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="space-y-1">
                          {detailCollection.gcashNumber && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">GCash #:</span>
                              <span className="text-sm font-mono font-semibold">{detailCollection.gcashNumber}</span>
                              <button onClick={() => copyGcash(detailCollection.gcashNumber!)} className="text-[#004EE0] hover:text-[#004EE0]/80">
                                {copiedGcash ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                        {detailCollection.paymentInstructions && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line mt-2 max-w-md">{detailCollection.paymentInstructions}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                {/* Payment filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Payments:</Label>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="UNPAID">Unpaid</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payments table */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                          <TableHead className="w-[40px]">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detailCollection.collectionPayments || [])
                          .filter((p) => paymentStatusFilter === "all" || p.status === paymentStatusFilter)
                          .map((payment, idx) => {
                            const pConfig = paymentStatusConfig[payment.status] || paymentStatusConfig.UNPAID;
                            return (
                              <TableRow key={payment.id}>
                                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-[10px] font-semibold">
                                      {getInitials(payment.user)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate max-w-[150px]">{getFullName(payment.user)}</p>
                                      <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{payment.user.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn(pConfig.color, "gap-1")} variant="secondary">
                                    <pConfig.icon className="h-3 w-3" />
                                    {pConfig.label}
                                  </Badge>
                                  {payment.verificationNotes && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">{payment.verificationNotes}</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {formatCurrency(payment.amountPaid || payment.amount)}
                                  {payment.transactionNumber && (
                                    <p className="text-[10px] text-muted-foreground">Tx: {payment.transactionNumber}</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {payment.proofUrl && (
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setProofImageUrl(payment.proofUrl!); setProofDialogOpen(true); }}>
                                        <ImageIcon className="mr-1 h-3 w-3" />
                                        Proof
                                      </Button>
                                    )}
                                    {canVerifyPayments && payment.status === "PENDING" && (
                                      <>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:bg-green-50" onClick={() => openVerifyDialog(payment, "verify")}>
                                          <CheckCircle2 className="mr-1 h-3 w-3" />Approve
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => openVerifyDialog(payment, "reject")}>
                                          <XCircle className="mr-1 h-3 w-3" />Reject
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        {(detailCollection.collectionPayments || []).filter((p) => paymentStatusFilter === "all" || p.status === paymentStatusFilter).length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No payments found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* ═══════════ VERIFY DIALOG ═══════════ */}
        <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{verifyAction === "verify" ? "Approve Payment" : "Reject Payment"}</DialogTitle>
              <DialogDescription>
                {verifyAction === "verify" ? "Add optional notes for the approval." : "Provide a reason for rejecting this payment."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {verifyPayment && (
                <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/30">
                  <p className="text-sm font-medium">{getFullName(verifyPayment.user)}</p>
                  <p className="text-xs text-muted-foreground">{verifyPayment.user.email}</p>
                  <p className="text-sm font-bold mt-1">{formatCurrency(verifyPayment.amountPaid || verifyPayment.amount)}</p>
                  {verifyPayment.proofUrl && (
                    <div className="mt-2">
                      <button onClick={() => { setProofImageUrl(verifyPayment.proofUrl!); setProofDialogOpen(true); }} className="text-xs text-[#004EE0] hover:underline flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> View proof
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>{verifyAction === "verify" ? "Notes (optional)" : "Rejection reason *"}</Label>
                <Textarea value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} placeholder={verifyAction === "verify" ? "Optional notes..." : "Reason for rejection..."} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerifyOpen(false)}>Cancel</Button>
              <Button onClick={handleVerify} disabled={isVerifying} variant={verifyAction === "reject" ? "destructive" : "default"} className={verifyAction === "verify" ? "bg-green-600 hover:bg-green-700" : ""}>
                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {verifyAction === "verify" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════ PROOF IMAGE DIALOG ═══════════ */}
        <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Proof of Payment</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img src={proofImageUrl} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded-lg border" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { if (proofImageUrl) window.open(proofImageUrl, "_blank"); }}>
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={() => setProofDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════ PAY NOW DIALOG ═══════════ */}
        <Dialog open={payOpen} onOpenChange={(open) => { if (!open) setPayOpen(false); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pay Collection Fee</DialogTitle>
              <DialogDescription>{payPayment?.collection.title}</DialogDescription>
            </DialogHeader>
            {payPayment && (
              <div className="space-y-4">
                {/* GCash Info */}
                {(payPayment.collection.gcashNumber || payPayment.collection.gcashQrUrl) && (
                  <Card className="border-[#004EE0]/20 bg-[#004EE0]/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="h-4 w-4 text-[#004EE0]" />
                        <p className="text-sm font-semibold text-[#004EE0]">GCash Payment</p>
                      </div>
                      <div className="flex flex-wrap gap-4 items-start">
                        {payPayment.collection.gcashQrUrl && (
                          <div className="w-28 h-28 rounded-lg overflow-hidden border bg-white p-1">
                            <img src={payPayment.collection.gcashQrUrl} alt="GCash QR" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="space-y-2 flex-1">
                          {payPayment.collection.gcashNumber && (
                            <div>
                              <p className="text-xs text-muted-foreground">GCash Number</p>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-mono font-bold">{payPayment.collection.gcashNumber}</span>
                                <button onClick={() => { navigator.clipboard.writeText(payPayment.collection.gcashNumber!); toast.success("Copied!"); }} className="text-[#004EE0] hover:text-[#004EE0]/80"><Copy className="h-4 w-4" /></button>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Amount to Pay</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(payPayment.amount)}</p>
                          </div>
                        </div>
                      </div>
                      {payPayment.collection.paymentInstructions && (
                        <div className="mt-3 p-2 rounded bg-white/50 dark:bg-slate-800/50 text-xs text-muted-foreground whitespace-pre-line">
                          {payPayment.collection.paymentInstructions}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="pay-tx">Transaction Number *</Label>
                  <Input id="pay-tx" placeholder="Enter GCash transaction number" value={payTxNumber} onChange={(e) => setPayTxNumber(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-amount">Amount Paid *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                    <Input id="pay-amount" type="number" min="0" step="0.01" className="pl-7" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload Receipt/Proof *</Label>
                  <input ref={payFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePayFileSelect} />
                  {payFilePreview ? (
                    <div className="relative rounded-lg border overflow-hidden">
                      <img src={payFilePreview} alt="Preview" className="w-full max-h-48 object-contain bg-slate-100" />
                      <button onClick={() => { setPaySelectedFile(null); setPayFilePreview(null); if (payFileInputRef.current) payFileInputRef.current.value = ""; }} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => payFileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed hover:border-[#004EE0] hover:bg-[#004EE0]/5 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">Click to upload receipt</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, WebP (max 10MB)</p>
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={payConfirm} onCheckedChange={(v) => setPayConfirm(v === true)} className="mt-0.5" />
                    <span className="text-xs text-amber-800 dark:text-amber-200">
                      I confirm that the payment proof I uploaded is authentic. I understand that submitting fraudulent proof may result in sanctions.
                    </span>
                  </label>
                </div>

                {payPayment.collection.endDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Deadline: {formatDate(payPayment.collection.endDate)}
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button onClick={handlePaySubmit} disabled={isSubmittingPayment || !payConfirm || !paySelectedFile} className="bg-[#004EE0] hover:bg-[#004EE0]/90 text-white">
                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : isSubmittingPayment ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════ MY PROOF IMAGE DIALOG ═══════════ */}
        <Dialog open={myProofOpen} onOpenChange={setMyProofOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img src={myProofUrl} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded-lg border" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { window.open(myProofUrl, "_blank"); }}>Open in New Tab</Button>
              <Button variant="outline" onClick={() => setMyProofOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );

  // ── Inner: Collections Tab ──
  function CollectionsTab() {
    return (
      <>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total Collections", count: stats.totalCollections, color: "text-slate-900 dark:text-white", icon: CreditCard, bg: "bg-slate-50 dark:bg-slate-800" },
            { label: "Active", count: stats.activeCollections, color: "text-green-600", icon: CheckCircle2, bg: "bg-green-50 dark:bg-green-900/10" },
            { label: "Draft", count: stats.draftCollections, color: "text-amber-600", icon: FileText, bg: "bg-amber-50 dark:bg-amber-900/10" },
            { label: "Closed", count: stats.closedCollections, color: "text-slate-500", icon: Archive, bg: "bg-slate-50 dark:bg-slate-800" },
            { label: "Total Collected", count: formatCurrency(stats.totalCollected), color: "text-[#1e3a8a] dark:text-blue-400", icon: CircleDollarSign, bg: "bg-blue-50 dark:bg-blue-900/10" },
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
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search collections..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
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

        {/* Collections Table/Cards */}
        {filteredCollections.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No collections found"
            description={statusFilter !== "all" ? "Try adjusting your filters" : canManage ? "Create a new collection to get started" : "No collections available yet"}
            action={canManage ? { label: "New Collection", onClick: openCreateForm, variant: "default" } : undefined}
            className="rounded-lg border border-dashed"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border bg-white dark:bg-slate-800 overflow-hidden">
              <div className="max-h-[calc(100vh-420px)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.map((col, index) => {
                      const config = collectionStatusConfig[col.status] || collectionStatusConfig.DRAFT;
                      const StatusIcon = config.icon;
                      const isClosed = col.status === "CLOSED";

                      return (
                        <TableRow key={col.id} className="group">
                          <TableCell className="text-xs text-muted-foreground">{(colPage - 1) * colLimit + index + 1}</TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[180px]">{col.title}</p>
                              {col.description && <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{col.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{targetLabel(col.targetRoles)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(col.amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(col.endDate)}</TableCell>
                          <TableCell>
                            <Badge className={`${config.color} gap-1`} variant="secondary">
                              <StatusIcon className="h-3 w-3" />{config.label}
                            </Badge>
                            {(col.pendingCount || 0) > 0 && canVerifyPayments && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 ml-1" variant="secondary">{col.pendingCount}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-green-600">{formatCurrency(col.totalCollected || 0)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openDetail(col)}>
                                <Eye className="mr-1 h-3 w-3" />View
                              </Button>
                              {canManage && col.status === "DRAFT" && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:bg-green-50" onClick={() => handleActivateCollection(col)}>
                                  <CheckCircle2 className="mr-1 h-3 w-3" />Activate
                                </Button>
                              )}
                              {canManage && !isClosed && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditForm(col)}>
                                  <Pencil className="mr-1 h-3 w-3" />Edit
                                </Button>
                              )}
                              {canManage && col.status === "ACTIVE" && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50" onClick={() => handleCloseCollection(col)}>
                                  <Ban className="mr-1 h-3 w-3" />Close
                                </Button>
                              )}
                              {canManage && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:bg-red-50" onClick={() => handleDeleteCollection(col)} disabled={isDeleting}>
                                  {isDeleting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                                  {isClosed ? "Delete" : ""}
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
              {filteredCollections.map((col) => {
                const config = collectionStatusConfig[col.status] || collectionStatusConfig.DRAFT;
                const StatusIcon = config.icon;
                const isClosed = col.status === "CLOSED";

                return (
                  <Card key={col.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold truncate">{col.title}</h3>
                            <Badge className={`${config.color} gap-1 shrink-0`} variant="secondary">
                              <StatusIcon className="h-2.5 w-2.5" />{config.label}
                            </Badge>
                          </div>
                          {col.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{col.description}</p>}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{targetLabel(col.targetRoles)}</span></div>
                            <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{formatCurrency(col.amount)}</span></div>
                            <div><span className="text-muted-foreground">Deadline:</span> <span className="font-medium">{formatDate(col.endDate)}</span></div>
                            <div><span className="text-muted-foreground">Collected:</span> <span className="font-medium text-green-600">{formatCurrency(col.totalCollected || 0)}</span></div>
                          </div>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openDetail(col)}><Eye className="mr-1 h-3 w-3" />View</Button>
                        {canManage && col.status === "DRAFT" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => handleActivateCollection(col)}><CheckCircle2 className="mr-1 h-3 w-3" />Activate</Button>
                        )}
                        {canManage && !isClosed && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditForm(col)}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
                        )}
                        {canManage && col.status === "ACTIVE" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleCloseCollection(col)}><Ban className="mr-1 h-3 w-3" />Close</Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDeleteCollection(col)} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {colTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Showing {(colPage - 1) * colLimit + 1}–{Math.min(colPage * colLimit, colTotal)} of {colTotal}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8" disabled={colPage <= 1} onClick={() => setColPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm px-2">{colPage} / {colTotalPages}</span>
                  <Button variant="outline" size="sm" className="h-8" disabled={colPage >= colTotalPages} onClick={() => setColPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  // ── Inner: My Payments Tab ──
  function MyPaymentsTab() {
    if (myLoading && myPayments.length === 0) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />)}</div>
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />)}</div>
        </div>
      );
    }

    return (
      <>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", count: myStats.total, color: "text-slate-900 dark:text-white", icon: CreditCard, bg: "bg-slate-50 dark:bg-slate-800" },
            { label: "Paid", count: myStats.paid, color: "text-green-600", icon: CheckCircle2, bg: "bg-green-50 dark:bg-green-900/10" },
            { label: "Pending", count: myStats.pending, color: "text-amber-600", icon: Clock, bg: "bg-amber-50 dark:bg-amber-900/10" },
            { label: "Unpaid", count: myStats.unpaid, color: "text-red-600", icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-900/10" },
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

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select value={myStatusFilter} onValueChange={setMyStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Cards */}
        {filteredMyPayments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payments found"
            description="You don't have any payment records matching this filter."
            className="rounded-lg border border-dashed"
          />
        ) : (
          <div className="space-y-3">
            {filteredMyPayments.map((payment) => {
              const pConfig = paymentStatusConfig[payment.status] || paymentStatusConfig.UNPAID;
              const PStatusIcon = pConfig.icon;
              const isActive = payment.collection.status === "ACTIVE";
              const canPay = isActive && (payment.status === "UNPAID" || payment.status === "REJECTED");

              return (
                <Card key={payment.id} className={cn("overflow-hidden", canPay && "border-[#004EE0]/30")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold truncate">{payment.collection.title}</h3>
                          <Badge className={`${pConfig.color} gap-1 shrink-0`} variant="secondary">
                            <PStatusIcon className="h-2.5 w-2.5" />{pConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {payment.collection.paymentMethod} • Deadline: {formatDate(payment.collection.endDate)}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Amount:</span> <span className="font-bold">{formatCurrency(payment.amount)}</span></div>
                          {payment.transactionNumber && <div><span className="text-muted-foreground">Tx #:</span> <span className="font-mono">{payment.transactionNumber}</span></div>}
                          {payment.trackingNumber && <div className="col-span-2"><span className="text-muted-foreground">Tracking:</span> <span className="font-mono text-[10px]">{payment.trackingNumber}</span></div>}
                        </div>
                        {payment.verificationNotes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">Note: {payment.verificationNotes}</p>
                        )}
                        {payment.proofUrl && (
                          <button onClick={() => { setMyProofUrl(payment.proofUrl!); setMyProofOpen(true); }} className="mt-2 text-xs text-[#004EE0] hover:underline flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> View submitted proof
                          </button>
                        )}
                      </div>
                      <div className="shrink-0">
                        {canPay && (
                          <Button onClick={() => openPayDialog(payment)} className="bg-[#004EE0] hover:bg-[#004EE0]/90 text-white h-8 text-xs">
                            <Smartphone className="mr-1 h-3 w-3" />Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </>
    );
  }
}
