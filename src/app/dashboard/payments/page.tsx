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
import { Combobox } from "@/components/ui/combobox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  Receipt,
  Clock,
  AlertTriangle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Building2,
  GraduationCap,
  CalendarDays,
  FileText,
  Loader2,
  RefreshCw,
  Smartphone,
  QrCode,
  Info,
  ShieldAlert,
  Banknote,
  Landmark,
  BadgeCheck,
  ImageIcon,
  Copy,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
interface PaymentUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  profile: {
    college: string | null;
    program: string | null;
    yearLevel: string | null;
    studentNumber: string | null;
    employeeId: string | null;
    office: {
      name: string;
      code: string | null;
      email: string | null;
    } | null;
  } | null;
}

interface Payment {
  id: string;
  userId: string;
  amount: number;
  month: number;
  year: number;
  referenceNumber: string | null;
  status: "UNPAID" | "PENDING" | "PAID" | "REJECTED";
  proofUrl: string | null;
  uploadedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  receiptUrl: string | null;
  receiptGeneratedAt: string | null;
  transactionNumber: string | null;
  amountPaid: number | null;
  createdAt: string;
  updatedAt: string;
  user: PaymentUser;
}

interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  unpaid: number;
  rejected: number;
  totalAmount: number;
}

interface SystemSettings {
  paymentCollectionEnabled: boolean;
  gcashQrUrl: string | null;
  gcashNumber: string | null;
  paymentInstructions: string | null;
  monthlyPaymentFee: number;
}

interface OfficerData {
  position: string;
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  PAID: { label: "Paid", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  UNPAID: { label: "Unpaid", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  REJECTED: { label: "Rejected", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: XCircle },
};

function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

function getMonthName(month: number): string {
  return MONTHS.find((m) => m.value === month)?.label || "Unknown";
}

function getInitials(user: PaymentUser): string {
  const f = user.firstName?.charAt(0) || "";
  const l = user.lastName?.charAt(0) || "";
  return `${f}${l}`;
}

function getFullName(user: PaymentUser): string {
  return [user.firstName, user.middleName ? `${user.middleName.charAt(0)}.` : null, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export default function PaymentsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const currentUserId = (session?.user as { id?: string })?.id;

  const isAdmin = ["SUPER_ADMIN", "HRMO", "ADVISER"].includes(userRole || "");
  const isOfficer = userRole === "OFFICER";
  const canGenerate = ["SUPER_ADMIN", "HRMO"].includes(userRole || "");
  const [officer, setOfficer] = useState<OfficerData | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const isTreasurer = isOfficer && officer?.position === "TREASURER";
  const isPresident = isOfficer && officer?.position === "PRESIDENT";
  const canVerify = isAdmin || isTreasurer || isPresident;
  const isSA = userRole === "STUDENT_ASSISTANT";
  const showPaymentCollection = systemSettings?.paymentCollectionEnabled === true;

  // Data state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({ total: 0, paid: 0, pending: 0, unpaid: 0, rejected: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filter state
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Dialog states
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"verify" | "reject">("verify");
  const [verifyPayment, setVerifyPayment] = useState<Payment | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofPayment, setProofPayment] = useState<Payment | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // GCash Pay Now dialog
  const [payNowOpen, setPayNowOpen] = useState(false);
  const [payNowPayment, setPayNowPayment] = useState<Payment | null>(null);
  const [payTxNumber, setPayTxNumber] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payConfirm, setPayConfirm] = useState(false);
  const [paySelectedFile, setPaySelectedFile] = useState<File | null>(null);
  const [payFilePreview, setPayFilePreview] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Transaction receipt dialog
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Action states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Generate dialog state
  const [genMonth, setGenMonth] = useState("");
  const [genYear, setGenYear] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const payFileInputRef = useRef<HTMLInputElement>(null);

  // Build available years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Fetch officer profile
  const fetchOfficer = useCallback(async () => {
    if (!currentUserId || userRole !== "OFFICER") return;
    try {
      const res = await fetch(`/api/officers/profile?userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setOfficer(data);
      }
    } catch {
      // Ignore
    }
  }, [currentUserId, userRole]);

  // Fetch system settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/system-settings");
      if (res.ok) {
        const data = await res.json();
        setSystemSettings({
          paymentCollectionEnabled: data.paymentCollectionEnabled || false,
          gcashQrUrl: data.gcashQrUrl || null,
          gcashNumber: data.gcashNumber || null,
          paymentInstructions: data.paymentInstructions || null,
          monthlyPaymentFee: data.monthlyPaymentFee || 20,
        });
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);
      if (monthFilter !== "all") params.set("month", monthFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setPayments(data.payments || []);
      setTotal(data.total || 0);

      setStats({
        total: data.total || 0,
        paid: 0,
        pending: 0,
        unpaid: 0,
        rejected: 0,
        totalAmount: 0,
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [page, search, monthFilter, yearFilter, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      if (search) params.set("search", search);
      if (monthFilter !== "all") params.set("month", monthFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const allPayments = data.payments || [];

      const computedStats: PaymentStats = {
        total: data.total || 0,
        paid: allPayments.filter((p: Payment) => p.status === "PAID").length,
        pending: allPayments.filter((p: Payment) => p.status === "PENDING").length,
        unpaid: allPayments.filter((p: Payment) => p.status === "UNPAID").length,
        rejected: allPayments.filter((p: Payment) => p.status === "REJECTED").length,
        totalAmount: allPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0),
      };
      setStats(computedStats);
    } catch {
      // Ignore
    }
  }, [search, monthFilter, yearFilter]);

  useEffect(() => {
    fetchOfficer();
    fetchSettings();
  }, [fetchOfficer, fetchSettings]);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments, fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [search, monthFilter, yearFilter, statusFilter]);

  // Handle proof upload (basic, from existing flow)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !proofPayment) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, and PDF files are allowed");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", file.type.startsWith("image/") ? "photo" : "document");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json();
        throw new Error(uploadData.error || "Failed to upload file");
      }

      const uploadData = await uploadRes.json();

      const updateRes = await fetch(`/api/payments/${proofPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_proof",
          proofUrl: uploadData.url,
        }),
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData.error || "Failed to update payment");
      }

      toast.success("Proof of payment uploaded successfully");
      setProofDialogOpen(false);
      setProofPayment(null);
      setProofUrl("");
      fetchPayments();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to upload proof");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle GCash Pay Now submission
  const handlePayNowSubmit = async () => {
    if (!payNowPayment || !paySelectedFile) return;
    if (!payTxNumber.trim()) {
      toast.error("Please enter the transaction number");
      return;
    }
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!payConfirm) {
      toast.error("Please confirm the authenticity of your payment");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      // Upload receipt image
      const formData = new FormData();
      formData.append("file", paySelectedFile);
      formData.append("type", "photo");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json();
        throw new Error(uploadData.error || "Failed to upload receipt");
      }

      const uploadData = await uploadRes.json();

      // Submit payment proof with transaction details
      const updateRes = await fetch(`/api/payments/${payNowPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_proof",
          proofUrl: uploadData.url,
          transactionNumber: payTxNumber.trim(),
          amountPaid: parseFloat(payAmount),
        }),
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData.error || "Failed to submit payment");
      }

      toast.success("Payment submitted successfully! Please wait for verification.");
      setPayNowOpen(false);
      setPayNowPayment(null);
      resetPayNowForm();

      // Show transaction receipt
      setReceiptPayment({
        ...payNowPayment,
        transactionNumber: payTxNumber.trim(),
        amountPaid: parseFloat(payAmount),
        status: "PENDING",
        uploadedAt: new Date().toISOString(),
      });
      setReceiptOpen(true);

      fetchPayments();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to submit payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const resetPayNowForm = () => {
    setPayTxNumber("");
    setPayAmount("");
    setPayConfirm(false);
    setPaySelectedFile(null);
    setPayFilePreview(null);
  };

  const handlePayFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed for GCash receipts");
      return;
    }

    setPaySelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPayFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle verification
  const handleVerify = async () => {
    if (!verifyPayment) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/payments/${verifyPayment.id}`, {
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

      toast.success(verifyAction === "verify" ? "Payment verified successfully" : "Payment rejected");
      setVerifyOpen(false);
      setVerifyPayment(null);
      setVerifyNotes("");
      fetchPayments();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to verify payment");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle bulk generate
  const handleGenerate = async () => {
    if (!genMonth || !genYear) {
      toast.error("Please select month and year");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(genMonth, 10),
          year: parseInt(genYear, 10),
          amount: 20.0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate payments");
      }

      const data = await res.json();
      toast.success(`Generated ${data.created} payments (${data.skipped} already existed)`);
      setGenerateOpen(false);
      setGenMonth("");
      setGenYear("");
      fetchPayments();
      fetchStats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate payments");
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Pay Now dialog
  const openPayNow = (payment: Payment) => {
    setPayNowPayment(payment);
    setPayAmount(systemSettings?.monthlyPaymentFee?.toString() || payment.amount.toString());
    setPayNowOpen(true);
    resetPayNowForm();
  };

  // Loading skeleton
  if (loading && payments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  // Default instructions if none set
  const defaultInstructions = `1. Open the GCash app on your phone\n2. Tap "Send Money" then "Express Send"\n3. Enter the GCash number shown above\n4. Enter the exact amount: ₱${systemSettings?.monthlyPaymentFee || 20.00}\n5. Review and confirm the transaction\n6. Take a screenshot of the successful payment\n7. Upload the screenshot below along with the transaction number`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            {(isAdmin || canVerify)
              ? "Manage student assistant monthly payments and verification"
              : "View and manage your monthly payment records"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchPayments(); fetchStats(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {canGenerate && (
            <Button
              onClick={() => setGenerateOpen(true)}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Generate Monthly Payments
            </Button>
          )}
        </div>
      </div>

      {/* Payment Collection Banner for SA */}
      {isSA && showPaymentCollection && (
        <div className="rounded-lg bg-gradient-to-r from-[#004EE0] to-[#003BB4] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Organizational Fee Payment Required</p>
              <p className="text-xs text-blue-100">
                Payment collection is active. Please settle your monthly organizational fee via GCash.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total Payments", count: stats.total, color: "text-slate-900 dark:text-white", icon: CreditCard, bg: "bg-slate-50 dark:bg-slate-800" },
          { label: "Paid", count: stats.paid, color: "text-green-600", icon: CheckCircle2, bg: "bg-green-50 dark:bg-green-900/10" },
          { label: "Pending", count: stats.pending, color: "text-amber-600", icon: Clock, bg: "bg-amber-50 dark:bg-amber-900/10" },
          { label: "Unpaid", count: stats.unpaid, color: "text-red-600", icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-900/10" },
          { label: "Total Amount", count: formatCurrency(stats.totalAmount), color: "text-[#1e3a8a] dark:text-blue-400", icon: Wallet, bg: "bg-blue-50 dark:bg-blue-900/10" },
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
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {(isAdmin || canVerify) && (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <Combobox
            options={[
              { value: "all", label: "All Months" },
              ...MONTHS.map((m) => ({
                value: m.value.toString(),
                label: m.label,
              })),
            ]}
            value={monthFilter}
            onChange={setMonthFilter}
            placeholder="All Months"
            className="w-[150px]"
          />
          <Combobox
            options={[
              { value: "all", label: "All Years" },
              ...years.map((y) => ({
                value: y.toString(),
                label: y.toString(),
              })),
            ]}
            value={yearFilter}
            onChange={setYearFilter}
            placeholder="All Years"
            className="w-[120px]"
          />
          <Combobox
            options={[
              { value: "all", label: "All Status" },
              { value: "PAID", label: "Paid" },
              { value: "PENDING", label: "Pending" },
              { value: "UNPAID", label: "Unpaid" },
              { value: "REJECTED", label: "Rejected" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Payments Table (Desktop) / Cards (Mobile) */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-sm font-medium text-muted-foreground">No payments found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {search || monthFilter !== "all" || yearFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters"
              : canGenerate
                ? "Generate monthly payments to get started"
                : "No payment records available yet"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border bg-white dark:bg-slate-800 overflow-hidden">
            <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Student Assistant</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Office</TableHead>
                    <TableHead>Month/Year</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => {
                    const config = statusConfig[payment.status] || statusConfig.UNPAID;
                    const StatusIcon = config.icon;
                    const fullName = getFullName(payment.user);

                    return (
                      <TableRow key={payment.id} className="group">
                        <TableCell className="text-xs text-muted-foreground">
                          {(page - 1) * limit + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                              {getInitials(payment.user)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{fullName || payment.user.email}</p>
                              <p className="text-xs text-muted-foreground truncate">{payment.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <GraduationCap className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{payment.user.profile?.college || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{payment.user.profile?.office?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getMonthName(payment.month)} {payment.year}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${config.color} gap-1`} variant="secondary">
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                            {isSA && payment.status === "UNPAID" && showPaymentCollection && (
                              <Badge className="bg-[#004EE0] text-white gap-1 animate-pulse" variant="secondary">
                                <Banknote className="h-3 w-3" />
                                To Pay
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setDetailPayment(payment); setDetailOpen(true); }}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            {/* Pay Now button for SA with GCash flow */}
                            {isSA && (payment.status === "UNPAID" || payment.status === "REJECTED") && showPaymentCollection && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-[#004EE0] hover:bg-[#004EE0]/90 text-white"
                                onClick={() => openPayNow(payment)}
                              >
                                <Smartphone className="mr-1 h-3 w-3" />
                                Pay Now
                              </Button>
                            )}
                            {/* Basic upload for SA without GCash flow */}
                            {isSA && (payment.status === "UNPAID" || payment.status === "REJECTED") && !showPaymentCollection && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => { setProofPayment(payment); setProofDialogOpen(true); }}
                              >
                                <Upload className="mr-1 h-3 w-3" />
                                Upload
                              </Button>
                            )}
                            {/* Verify/Reject buttons */}
                            {canVerify && payment.status === "PENDING" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    setVerifyPayment(payment);
                                    setVerifyAction("verify");
                                    setVerifyNotes("");
                                    setVerifyOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setVerifyPayment(payment);
                                    setVerifyAction("reject");
                                    setVerifyNotes("");
                                    setVerifyOpen(true);
                                  }}
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {payment.status === "PAID" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setDetailPayment(payment);
                                  setDetailOpen(true);
                                }}
                              >
                                <Download className="mr-1 h-3 w-3" />
                                Receipt
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
          <div className="space-y-3 md:hidden">
            {payments.map((payment) => {
              const config = statusConfig[payment.status] || statusConfig.UNPAID;
              const StatusIcon = config.icon;
              const fullName = getFullName(payment.user);

              return (
                <Card key={payment.id} className="overflow-hidden">
                  <div className={`h-1 ${
                    payment.status === "PAID" ? "bg-green-500" :
                    payment.status === "PENDING" ? "bg-amber-500" :
                    payment.status === "REJECTED" ? "bg-slate-400" : "bg-red-500"
                  }`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-semibold">
                          {getInitials(payment.user)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">{fullName || payment.user.email}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">
                              {payment.user.profile?.college || "No college"}
                            </p>
                            {payment.user.profile?.office && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <p className="text-xs text-muted-foreground truncate">
                                  {payment.user.profile.office.name}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`${config.color} gap-1 shrink-0`} variant="secondary">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        {isSA && payment.status === "UNPAID" && showPaymentCollection && (
                          <Badge className="bg-[#004EE0] text-white gap-1 animate-pulse" variant="secondary">
                            <Banknote className="h-2.5 w-2.5" />
                            To Pay
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{getMonthName(payment.month)} {payment.year}</span>
                        <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                      </div>
                      {payment.referenceNumber && (
                        <p className="text-[10px] text-muted-foreground font-mono">{payment.referenceNumber}</p>
                      )}
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setDetailPayment(payment); setDetailOpen(true); }}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      {isSA && (payment.status === "UNPAID" || payment.status === "REJECTED") && showPaymentCollection && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-[#004EE0] hover:bg-[#004EE0]/90 text-white"
                          onClick={() => openPayNow(payment)}
                        >
                          <Smartphone className="mr-1 h-3 w-3" />
                          Pay Now
                        </Button>
                      )}
                      {isSA && (payment.status === "UNPAID" || payment.status === "REJECTED") && !showPaymentCollection && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setProofPayment(payment); setProofDialogOpen(true); }}
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Upload
                        </Button>
                      )}
                      {canVerify && payment.status === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-green-600 hover:text-green-700"
                            onClick={() => {
                              setVerifyPayment(payment);
                              setVerifyAction("verify");
                              setVerifyNotes("");
                              setVerifyOpen(true);
                            }}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                            onClick={() => {
                              setVerifyPayment(payment);
                              setVerifyAction("reject");
                              setVerifyNotes("");
                              setVerifyOpen(true);
                            }}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Reject
                          </Button>
                        </>
                      )}
                      {payment.status === "PAID" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setDetailPayment(payment);
                            setDetailOpen(true);
                          }}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Payment Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Full payment information and history</DialogDescription>
          </DialogHeader>
          {detailPayment && (() => {
            const config = statusConfig[detailPayment.status] || statusConfig.UNPAID;
            const StatusIcon = config.icon;
            const fullName = getFullName(detailPayment.user);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-lg font-bold">
                      {getInitials(detailPayment.user)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{fullName || detailPayment.user.email}</h3>
                      <p className="text-xs text-muted-foreground">{detailPayment.user.email}</p>
                    </div>
                  </div>
                  <Badge className={`${config.color} gap-1`} variant="secondary">
                    <StatusIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reference No.</span>
                    <span className="font-mono text-xs">{detailPayment.referenceNumber || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Period</span>
                    <span className="font-medium">{getMonthName(detailPayment.month)} {detailPayment.year}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg">{formatCurrency(detailPayment.amount)}</span>
                  </div>
                  {detailPayment.transactionNumber && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Transaction No.</span>
                      <span className="font-mono text-xs">{detailPayment.transactionNumber}</span>
                    </div>
                  )}
                  {detailPayment.amountPaid !== undefined && detailPayment.amountPaid !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-semibold text-green-600">{formatCurrency(detailPayment.amountPaid)}</span>
                    </div>
                  )}

                  {detailPayment.user.profile?.college && (
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>{detailPayment.user.profile.college}</span>
                      {detailPayment.user.profile.program && (
                        <span className="text-muted-foreground">• {detailPayment.user.profile.program}</span>
                      )}
                    </div>
                  )}
                  {detailPayment.user.profile?.office && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{detailPayment.user.profile.office.name}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Proof of Payment */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Proof of Payment</h4>
                  {detailPayment.proofUrl ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3">
                        {detailPayment.proofUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                          <img
                            src={detailPayment.proofUrl}
                            alt="Proof of payment"
                            className="max-h-60 w-full rounded-md object-contain"
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span>Document uploaded</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {detailPayment.uploadedAt ? format(new Date(detailPayment.uploadedAt), "MMM d, yyyy 'at' h:mm a") : "Unknown date"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No proof uploaded yet</p>
                  )}
                </div>

                {detailPayment.verifiedAt && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Verification</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Verified By</span>
                          <span className="font-medium">{detailPayment.verifiedBy || "Admin"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Verified At</span>
                          <span>{format(new Date(detailPayment.verifiedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                        {detailPayment.verificationNotes && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Notes: </span>
                            <span>{detailPayment.verificationNotes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {detailPayment.status === "PAID" && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Receipt className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">Receipt Available</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="mr-2 h-3 w-3" />
                        Download Receipt
                      </Button>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex items-center gap-2 flex-wrap">
                  {isSA && (detailPayment.status === "UNPAID" || detailPayment.status === "REJECTED") && showPaymentCollection && (
                    <Button
                      className="bg-[#004EE0] hover:bg-[#004EE0]/90 text-white"
                      size="sm"
                      onClick={() => {
                        setDetailOpen(false);
                        openPayNow(detailPayment);
                      }}
                    >
                      <Smartphone className="mr-2 h-3 w-3" />
                      Pay Now
                    </Button>
                  )}
                  {isSA && (detailPayment.status === "UNPAID" || detailPayment.status === "REJECTED") && !showPaymentCollection && (
                    <Button
                      className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                      size="sm"
                      onClick={() => {
                        setDetailOpen(false);
                        setProofPayment(detailPayment);
                        setProofDialogOpen(true);
                      }}
                    >
                      <Upload className="mr-2 h-3 w-3" />
                      Upload Proof
                    </Button>
                  )}
                  {canVerify && detailPayment.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setDetailOpen(false);
                          setVerifyPayment(detailPayment);
                          setVerifyAction("verify");
                          setVerifyNotes("");
                          setVerifyOpen(true);
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setDetailOpen(false);
                          setVerifyPayment(detailPayment);
                          setVerifyAction("reject");
                          setVerifyNotes("");
                          setVerifyOpen(true);
                        }}
                      >
                        <XCircle className="mr-2 h-3 w-3" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* GCash Pay Now Dialog */}
      <Dialog open={payNowOpen} onOpenChange={(open) => {
        setPayNowOpen(open);
        if (!open) resetPayNowForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#004EE0]/10">
                <Smartphone className="h-4 w-4 text-[#004EE0]" />
              </div>
              Pay via GCash
            </DialogTitle>
            <DialogDescription>
              {payNowPayment
                ? `Payment for ${getMonthName(payNowPayment.month)} ${payNowPayment.year}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {payNowPayment && (
            <div className="space-y-5">
              {/* GCash QR Code */}
              {systemSettings?.gcashQrUrl && (
                <div className="flex flex-col items-center">
                  <div className="rounded-xl border-2 border-[#004EE0]/20 bg-white p-3 shadow-sm">
                    <img
                      src={systemSettings.gcashQrUrl}
                      alt="GCash QR Code"
                      className="h-48 w-48 object-contain"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Scan this QR code with GCash</p>
                </div>
              )}

              {/* GCash Number */}
              {systemSettings?.gcashNumber && (
                <div className="rounded-lg bg-[#004EE0]/5 border border-[#004EE0]/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#004EE0]/10">
                        <Smartphone className="h-5 w-5 text-[#004EE0]" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">GCash Number</p>
                        <p className="text-lg font-bold text-[#004EE0]">{systemSettings.gcashNumber}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(systemSettings.gcashNumber.replace(/\s/g, ""));
                        toast.success("GCash number copied!");
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(payNowPayment.amount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getMonthName(payNowPayment.month)} {payNowPayment.year} — Organizational Fee
                </p>
              </div>

              {/* Payment Instructions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-[#004EE0]" />
                  How to Pay
                </h4>
                <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-4">
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {systemSettings?.paymentInstructions || defaultInstructions}
                  </pre>
                </div>
              </div>

              <Separator />

              {/* Submit Payment Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#004EE0]" />
                  Submit Payment Proof
                </h4>

                {/* Receipt Screenshot */}
                <div className="space-y-2">
                  <Label>Receipt Screenshot</Label>
                  {payFilePreview ? (
                    <div className="relative inline-block">
                      <div className="rounded-lg border p-1 bg-white">
                        <img
                          src={payFilePreview}
                          alt="Receipt preview"
                          className="h-32 w-auto rounded-md object-contain"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => {
                          setPaySelectedFile(null);
                          setPayFilePreview(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-[#004EE0]/50 hover:bg-[#004EE0]/5 transition-colors"
                      onClick={() => payFileInputRef.current?.click()}
                    >
                      <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Click to upload receipt screenshot
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, or WebP (max 10MB)
                      </p>
                    </div>
                  )}
                  <input
                    ref={payFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handlePayFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Transaction Number */}
                <div className="space-y-2">
                  <Label htmlFor="payTxNumber">GCash Transaction Number</Label>
                  <Input
                    id="payTxNumber"
                    value={payTxNumber}
                    onChange={(e) => setPayTxNumber(e.target.value)}
                    placeholder="e.g., 1234567890123"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can find this on your GCash transaction receipt
                  </p>
                </div>

                {/* Amount Paid */}
                <div className="space-y-2">
                  <Label htmlFor="payAmount">Amount Paid (₱)</Label>
                  <Input
                    id="payAmount"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    min={0}
                    step={0.01}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the exact amount you sent
                  </p>
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <Checkbox
                    id="payConfirm"
                    checked={payConfirm}
                    onCheckedChange={(checked) => setPayConfirm(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="payConfirm" className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed cursor-pointer">
                    I confirm that this payment is authentic and the receipt is genuine. Any falsification of payment proof will result in sanctions per the Student Handbook.
                  </Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayNowOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePayNowSubmit}
              disabled={isSubmittingPayment || !paySelectedFile || !payTxNumber.trim() || !payConfirm}
              className="bg-[#004EE0] hover:bg-[#004EE0]/90 text-white"
            >
              {isSubmittingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-amber-500" />
              Transaction Receipt
            </DialogTitle>
            <DialogDescription>
              Your payment proof has been submitted
            </DialogDescription>
          </DialogHeader>
          {receiptPayment && (
            <div className="space-y-4">
              {/* Receipt Card */}
              <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-5 bg-white dark:bg-slate-900 space-y-3">
                <div className="text-center space-y-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">UMak SAS</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Payment Submission Receipt</p>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-xs">{receiptPayment.referenceNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span className="font-medium">{getMonthName(receiptPayment.month)} {receiptPayment.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction No.</span>
                    <span className="font-mono text-xs">{receiptPayment.transactionNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold text-[#004EE0]">
                      {formatCurrency(receiptPayment.amountPaid || receiptPayment.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{format(new Date(receiptPayment.uploadedAt || new Date()), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1" variant="secondary">
                      <Clock className="h-3 w-3" />
                      PENDING VERIFICATION
                    </Badge>
                  </div>
                </div>

                <Separator />

                <p className="text-[10px] text-center text-muted-foreground">
                  This receipt confirms your payment proof submission. Payment will be verified by the Treasurer.
                </p>
              </div>

              {/* Warning */}
              <div className="flex gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-300">
                  <strong>Warning:</strong> Falsification of payment proof is a serious offense and will result in disciplinary sanctions per the Student Handbook, which may include suspension or dismissal from the Student Assistant program.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setReceiptOpen(false)} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Payments Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Monthly Payments</DialogTitle>
            <DialogDescription>
              Create payment records for all active student assistants. Existing payments for the selected period will be skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={genMonth} onValueChange={setGenMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={genYear} onValueChange={setGenYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3 text-sm">
              <p className="text-muted-foreground">
                Each payment will be for <span className="font-semibold">₱{systemSettings?.monthlyPaymentFee || 20.00}</span> with status <span className="font-semibold text-red-600">Unpaid</span>.
                {showPaymentCollection && " Student assistants will see GCash payment prompts."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!genMonth || !genYear || isGenerating}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Payments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {verifyAction === "verify" ? "Verify Payment" : "Reject Payment"}
            </DialogTitle>
            <DialogDescription>
              {verifyAction === "verify"
                ? "This will mark the payment as paid and generate a receipt."
                : "This will reject the proof of payment. The student assistant will need to re-upload."}
            </DialogDescription>
          </DialogHeader>
          {verifyPayment && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SA</span>
                  <span className="font-medium">{getFullName(verifyPayment.user)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Period</span>
                  <span>{getMonthName(verifyPayment.month)} {verifyPayment.year}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">{formatCurrency(verifyPayment.amount)}</span>
                </div>
                {verifyPayment.transactionNumber && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">Transaction No.</span>
                    <span className="font-mono text-xs">{verifyPayment.transactionNumber}</span>
                  </div>
                )}
                {verifyPayment.amountPaid !== undefined && verifyPayment.amountPaid !== null && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold text-green-600">{formatCurrency(verifyPayment.amountPaid)}</span>
                  </div>
                )}
              </div>

              {verifyPayment.proofUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Proof of Payment</Label>
                  <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-2">
                    {verifyPayment.proofUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <img
                        src={verifyPayment.proofUrl}
                        alt="Proof of payment"
                        className="max-h-40 w-full rounded-md object-contain"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm p-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span>Document uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {verifyAction === "verify" ? "Notes (optional)" : "Rejection Reason (required)"}
                </Label>
                <Textarea
                  placeholder={
                    verifyAction === "verify"
                      ? "Add any notes for this verification..."
                      : "Please explain why the proof of payment is being rejected..."
                  }
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isVerifying || (verifyAction === "reject" && !verifyNotes.trim())}
              className={
                verifyAction === "verify"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : verifyAction === "verify" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify Payment
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Basic Proof Upload Dialog (fallback without GCash) */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Proof of Payment</DialogTitle>
            <DialogDescription>
              Upload a photo or document as proof of payment for{" "}
              {proofPayment ? `${getMonthName(proofPayment.month)} ${proofPayment.year}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {proofPayment && (
              <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">{formatCurrency(proofPayment.amount)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-xs">{proofPayment.referenceNumber || "—"}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select File</Label>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-[#1e3a8a]/50 hover:bg-[#1e3a8a]/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {proofUrl ? "File selected" : "Click to select a file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WebP, or PDF (max 10MB)
                </p>
                {proofUrl && (
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                    File selected
                  </Badge>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProofDialogOpen(false); setProofPayment(null); setProofUrl(""); }}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
