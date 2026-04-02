"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Award,
  Search,
  Filter,
  Plus,
  Eye,
  Ban,
  Download,
  QrCode,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  Building2,
  Calendar,
  FileCheck,
  CheckCircle,
  XCircle,
  Loader2,
  GraduationCap,
  Users,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CertificateItem {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  photoUrl: string | null;
  college: string | null;
  officeName: string | null;
  type: string;
  referenceNumber: string;
  title: string;
  officeAssigned: string | null;
  servicePeriod: string | null;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  dateIssued: string | null;
  approvingAuthority: string;
  approvedByName: string | null;
  approvedByTitle: string | null;
  status: string;
  revokedAt: string | null;
  revokeReason: string | null;
  verificationUrl: string | null;
  createdAt: string | null;
}

interface CertificateDetail extends CertificateItem {
  fullName: string;
  phone: string | null;
  studentNumber: string | null;
  program: string | null;
  yearLevel: string | null;
  revokedBy: string | null;
  qrCode: string | null;
  documentUrl: string | null;
  updatedAt: string | null;
}

interface SAOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  college: string | null;
  officeName: string | null;
}

// ─── Configs ─────────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; color: string; icon: typeof Award }> = {
  CERTIFICATE_OF_SERVICE: {
    label: "Service",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Briefcase,
  },
  CERTIFICATE_OF_COMPLETION: {
    label: "Completion",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: GraduationCap,
  },
  CERTIFICATE_OF_EMPLOYMENT: {
    label: "Employment",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    icon: Award,
  },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  ACTIVE: {
    label: "Active",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: ShieldCheck,
  },
  REVOKED: {
    label: "Revoked",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: ShieldX,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Shield,
  },
};

const authorityConfig: Record<string, string> = {
  ADVISER: "SA Adviser",
  PRESIDENT: "University President",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CertificatesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const canCreate = userRole === "SUPER_ADMIN" || userRole === "ADVISER";
  const canRevoke = userRole === "SUPER_ADMIN";

  // ─── Data State ───────────────────────────────────────────────────────────
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // ─── Filter State ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ─── Modal State ──────────────────────────────────────────────────────────
  const [issueOpen, setIssueOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificateDetail | CertificateItem | null>(null);
  const [certDetail, setCertDetail] = useState<CertificateDetail | null>(null);

  // ─── Form State ───────────────────────────────────────────────────────────
  const [saOptions, setSaOptions] = useState<SAOption[]>([]);
  const [saSearch, setSaSearch] = useState("");
  const [selectedSA, setSelectedSA] = useState("");
  const [formType, setFormType] = useState("CERTIFICATE_OF_SERVICE");
  const [formTitle, setFormTitle] = useState("");
  const [formOffice, setFormOffice] = useState("");
  const [formPeriod, setFormPeriod] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formAuthority, setFormAuthority] = useState("ADVISER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);

  // ─── Fetch Certificates ───────────────────────────────────────────────────
  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/certificates?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch certificates");
      const data = await res.json();
      setCertificates(data.certificates || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // ─── Fetch SA Options ─────────────────────────────────────────────────────
  const fetchSAOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/student-assistants?limit=100&status=ACTIVE");
      if (!res.ok) return;
      const data = await res.json();
      setSaOptions(
        (data.studentAssistants || []).map(
          (sa: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            college: string | null;
            officeName: string | null;
          }) => ({
            id: sa.id,
            firstName: sa.firstName,
            lastName: sa.lastName,
            email: sa.email,
            college: sa.college,
            officeName: sa.officeName,
          })
        )
      );
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (issueOpen) fetchSAOptions();
  }, [issueOpen, fetchSAOptions]);

  // ─── Filtered SA options for dropdown ─────────────────────────────────────
  const filteredSAOptions = saOptions.filter(
    (sa) =>
      !saSearch ||
      `${sa.firstName} ${sa.lastName}`.toLowerCase().includes(saSearch.toLowerCase()) ||
      sa.email.toLowerCase().includes(saSearch.toLowerCase())
  );

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total: total,
    active: certificates.filter((c) => c.status === "ACTIVE").length,
    revoked: certificates.filter((c) => c.status === "REVOKED").length,
    service: certificates.filter((c) => c.type === "CERTIFICATE_OF_SERVICE").length,
    completion: certificates.filter((c) => c.type === "CERTIFICATE_OF_COMPLETION").length,
    employment: certificates.filter((c) => c.type === "CERTIFICATE_OF_EMPLOYMENT").length,
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleIssueCertificate = async () => {
    if (!selectedSA || !formTitle) {
      toast.error("Please select a Student Assistant and enter a title");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSAData = saOptions.find((sa) => sa.id === selectedSA);
      const autoTitle = formTitle || `Certificate of ${typeConfig[formType]?.label || "Service"}`;
      const autoOffice = formOffice || selectedSAData?.officeName || "";

      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedSA,
          type: formType,
          title: autoTitle,
          officeAssigned: autoOffice || null,
          servicePeriod: formPeriod || null,
          serviceStartDate: formStartDate || null,
          serviceEndDate: formEndDate || null,
          approvingAuthority: userRole === "ADVISER" ? "ADVISER" : formAuthority,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to issue certificate");
      }

      toast.success("Certificate issued successfully!");
      resetForm();
      setIssueOpen(false);
      fetchCertificates();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to issue certificate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSA("");
    setFormType("CERTIFICATE_OF_SERVICE");
    setFormTitle("");
    setFormOffice("");
    setFormPeriod("");
    setFormStartDate("");
    setFormEndDate("");
    setFormAuthority("ADVISER");
    setSaSearch("");
  };

  const handleViewCertificate = async (cert: CertificateItem) => {
    try {
      const res = await fetch(`/api/certificates/${cert.id}`);
      if (!res.ok) throw new Error("Failed to fetch certificate detail");
      const data = await res.json();
      setCertDetail(data);
      setSelectedCert(cert);
      setPreviewOpen(true);
    } catch {
      toast.error("Failed to load certificate details");
    }
  };

  const handleRevokeCertificate = async () => {
    if (!selectedCert || !revokeReason.trim()) {
      toast.error("Please provide a reason for revocation");
      return;
    }

    setIsRevoking(true);
    try {
      const res = await fetch(`/api/certificates/${selectedCert.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          revokeReason: revokeReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke certificate");
      }

      toast.success("Certificate revoked successfully");
      setRevokeOpen(false);
      setSelectedCert(null);
      setRevokeReason("");
      fetchCertificates();
      if (previewOpen) setPreviewOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke certificate");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDownload = (cert: CertificateItem) => {
    // In a real app, this would generate a PDF. For now, open preview.
    handleViewCertificate(cert);
    toast.info("Certificate preview opened. PDF generation would be available in production.");
  };

  const handleGenerateCertificate = async (cert: CertificateItem) => {
    try {
      // Fetch full certificate detail if not already loaded
      let detail: CertificateDetail = certDetail!;
      if (!detail || detail.id !== cert.id) {
        const res = await fetch(`/api/certificates/${cert.id}`);
        if (!res.ok) throw new Error("Failed to fetch certificate detail");
        detail = await res.json();
      }

      const typeName = detail.type.replace(/CERTIFICATE_OF_/, "").replace(/_/g, " ");
      const issuerDate = detail.dateIssued ? format(new Date(detail.dateIssued), "MMMM d, yyyy") : format(new Date(), "MMMM d, yyyy");
      const startDate = detail.serviceStartDate ? format(new Date(detail.serviceStartDate), "MMMM d, yyyy") : null;
      const endDate = detail.serviceEndDate ? format(new Date(detail.serviceEndDate), "MMMM d, yyyy") : null;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${detail.title} - ${detail.fullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #f8f9fa;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 24px;
      background: #1e3a8a;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      z-index: 100;
    }
    .print-btn:hover { background: #1e3a8a/90; }
    .certificate {
      width: 800px;
      min-height: 600px;
      background: linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fffbeb 100%);
      border: 3px solid #d4a843;
      border-radius: 12px;
      padding: 60px;
      position: relative;
      margin-top: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .certificate::before {
      content: '';
      position: absolute;
      inset: 8px;
      border: 1px solid rgba(212, 168, 67, 0.4);
      border-radius: 8px;
      pointer-events: none;
    }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 28px; color: #1e3a8a; font-weight: 700; letter-spacing: 2px; }
    .header .subtitle { font-size: 12px; color: #6b7280; letter-spacing: 4px; text-transform: uppercase; margin-top: 4px; }
    .divider { width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #d4a843, transparent); margin: 16px auto; }
    .cert-type { text-align: center; margin-bottom: 30px; }
    .cert-type h2 { font-size: 32px; color: #1e3a8a; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
    .cert-body { text-align: center; margin-bottom: 40px; }
    .cert-body .intro { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
    .cert-body .name { font-size: 36px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .cert-body .college { font-size: 14px; color: #6b7280; }
    .cert-content {
      background: rgba(30, 58, 138, 0.04);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 40px;
    }
    .cert-content p { font-size: 14px; color: #374151; margin-bottom: 16px; }
    .cert-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: left; }
    .cert-details .detail-item .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
    .cert-details .detail-item .value { font-size: 14px; color: #111827; font-weight: 600; }
    .approval { text-align: center; margin-bottom: 30px; }
    .approval .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; }
    .approval .name { font-size: 18px; font-weight: 700; color: #111827; }
    .approval .title-text { font-size: 13px; color: #6b7280; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid rgba(212, 168, 67, 0.3); }
    .footer .info .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
    .footer .info .value { font-size: 13px; color: #374151; font-weight: 600; }
    .qr-section { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .qr-section img { width: 80px; height: 80px; }
    .qr-section .ref-text { font-size: 11px; color: #6b7280; font-family: 'Courier New', monospace; }
    .status-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-15deg);
      font-size: 48px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 8px;
      pointer-events: none;
      opacity: 0.15;
    }
    .status-watermark.revoked { color: #ef4444; }
    .status-watermark.expired { color: #f59e0b; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="certificate">
    ${detail.status !== "ACTIVE" ? `<div class="status-watermark ${detail.status.toLowerCase()}">${detail.status}</div>` : ""}
    <div class="header">
      <h1>UNIVERSITY OF MAKATI</h1>
      <p class="subtitle">Student Assistant Management System</p>
      <div class="divider"></div>
    </div>
    <div class="cert-type">
      <h2>${typeName}</h2>
    </div>
    <div class="cert-body">
      <p class="intro">This is to certify that</p>
      <p class="name">${detail.fullName}</p>
      ${detail.college ? `<p class="college">${detail.college}</p>` : ""}
    </div>
    <div class="cert-content">
      <p>has satisfactorily completed the requirements for</p>
      <div class="cert-details">
        <div class="detail-item">
          <p class="label">Certificate</p>
          <p class="value">${detail.title}</p>
        </div>
        ${detail.officeAssigned ? `<div class="detail-item"><p class="label">Office Assigned</p><p class="value">${detail.officeAssigned}</p></div>` : ""}
        ${detail.servicePeriod ? `<div class="detail-item"><p class="label">Service Period</p><p class="value">${detail.servicePeriod}</p></div>` : ""}
        ${startDate ? `<div class="detail-item"><p class="label">Start Date</p><p class="value">${startDate}</p></div>` : ""}
        ${endDate ? `<div class="detail-item"><p class="label">End Date</p><p class="value">${endDate}</p></div>` : ""}
      </div>
    </div>
    <div class="approval">
      <p class="label">Approved by</p>
      <p class="name">${detail.approvedByName || authorityConfig[detail.approvingAuthority] || detail.approvingAuthority}</p>
      <p class="title-text">${detail.approvedByTitle || authorityConfig[detail.approvingAuthority] || ""}</p>
    </div>
    <div class="footer">
      <div class="info">
        <p class="label">Date Issued</p>
        <p class="value">${issuerDate}</p>
      </div>
      <div class="qr-section">
        ${detail.qrCode ? `<img src="${detail.qrCode}" alt="QR Code" />` : ""}
        <p class="ref-text">${detail.referenceNumber}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      } else {
        toast.error("Please allow pop-ups to generate certificates");
      }
    } catch {
      toast.error("Failed to generate certificate");
    }
  };

  // ─── Auto-fill title when type changes ────────────────────────────────────
  useEffect(() => {
    if (selectedSA && !formTitle) {
      const sa = saOptions.find((s) => s.id === selectedSA);
      const typeName = typeConfig[formType]?.label || "Service";
      setFormTitle(`Certificate of ${typeName}`);
    }
  }, [formType, selectedSA, saOptions, formTitle]);

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading && certificates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="h-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <CRUDToolbar
          title="Certificates"
          entityLabel="Certificates"
          onAdd={canCreate ? () => setIssueOpen(true) : undefined}
          onSearch={(value) => { setSearch(value); setPage(1); }}
          showAdd={!!canCreate}
        />

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "Total Issued", count: stats.total, icon: Award, color: "text-slate-900 dark:text-white" },
            { label: "Active", count: stats.active, icon: ShieldCheck, color: "text-green-600" },
            { label: "Revoked", count: stats.revoked, icon: ShieldX, color: "text-red-600" },
            { label: "Of Service", count: stats.service, icon: Briefcase, color: "text-blue-600" },
            { label: "Of Completion", count: stats.completion, icon: GraduationCap, color: "text-emerald-600" },
            { label: "Of Employment", count: stats.employment, icon: FileCheck, color: "text-purple-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-white p-3 dark:bg-slate-800">
              <div className="flex items-center gap-1.5">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search moved to CRUDToolbar */}
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CERTIFICATE_OF_SERVICE">Certificate of Service</SelectItem>
                <SelectItem value="CERTIFICATE_OF_COMPLETION">Certificate of Completion</SelectItem>
                <SelectItem value="CERTIFICATE_OF_EMPLOYMENT">Certificate of Employment</SelectItem>
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
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-lg border bg-white dark:bg-slate-800">
          {certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Award className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-sm font-medium text-muted-foreground">No certificates found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : canCreate
                    ? "Issue your first certificate to get started"
                    : "No certificates have been issued yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Student Assistant</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Service Period</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => {
                  const fullName = `${cert.firstName} ${cert.lastName}`.trim();
                  const initials = `${cert.firstName.charAt(0)}${cert.lastName.charAt(0)}`;
                  const tc = typeConfig[cert.type] || typeConfig.CERTIFICATE_OF_SERVICE;
                  const sc = statusConfig[cert.status] || statusConfig.ACTIVE;

                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{fullName}</p>
                            {cert.college && (
                              <p className="text-xs text-muted-foreground truncate">{cert.college}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {cert.referenceNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={tc.color} variant="secondary">
                          {tc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">{cert.officeAssigned || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">{cert.servicePeriod || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cert.dateIssued ? format(new Date(cert.dateIssued), "MMM d, yyyy") : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {authorityConfig[cert.approvingAuthority] || cert.approvingAuthority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={sc.color} variant="secondary">
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleViewCertificate(cert)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Certificate</TooltipContent>
                          </Tooltip>
                          {canRevoke && cert.status === "ACTIVE" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedCert(cert);
                                    setRevokeOpen(true);
                                  }}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Revoke Certificate</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleGenerateCertificate(cert)}
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate Certificate</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDownload(cert)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden">
          {certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Award className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-sm font-medium text-muted-foreground">No certificates found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No certificates have been issued yet"}
              </p>
            </div>
          ) : (
            certificates.map((cert) => {
              const fullName = `${cert.firstName} ${cert.lastName}`.trim();
              const initials = `${cert.firstName.charAt(0)}${cert.lastName.charAt(0)}`;
              const tc = typeConfig[cert.type] || typeConfig.CERTIFICATE_OF_SERVICE;
              const sc = statusConfig[cert.status] || statusConfig.ACTIVE;

              return (
                <Card key={cert.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-semibold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold truncate">{fullName}</h3>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">{cert.referenceNumber}</p>
                        </div>
                      </div>
                      <Badge className={sc.color} variant="secondary">
                        {sc.label}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className={tc.color} variant="secondary">
                        {tc.label}
                      </Badge>
                      {cert.officeAssigned && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{cert.officeAssigned}</span>
                        </span>
                      )}
                      {cert.servicePeriod && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[120px]">{cert.servicePeriod}</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">
                        {cert.dateIssued ? format(new Date(cert.dateIssued), "MMM d, yyyy") : "—"}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleViewCertificate(cert)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        {canRevoke && cert.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                            onClick={() => {
                              setSelectedCert(cert);
                              setRevokeOpen(true);
                            }}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Revoke
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleGenerateCertificate(cert)}
                        >
                          <FileCheck className="mr-1 h-3 w-3" />
                          Generate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleDownload(cert)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
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

        {/* ─── Issue Certificate Dialog ──────────────────────────────────── */}
        <Dialog open={issueOpen} onOpenChange={(open) => { setIssueOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Issue Certificate</DialogTitle>
              <DialogDescription>
                Create a new certificate for a student assistant
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* SA Selector */}
              <div className="space-y-2">
                <Label>Student Assistant *</Label>
                <Select value={selectedSA} onValueChange={setSelectedSA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student assistant..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search by name..."
                        value={saSearch}
                        onChange={(e) => setSaSearch(e.target.value)}
                        className="h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {filteredSAOptions.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No student assistants found
                      </div>
                    ) : (
                      filteredSAOptions.map((sa) => (
                        <SelectItem key={sa.id} value={sa.id}>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                              {sa.firstName.charAt(0)}{sa.lastName.charAt(0)}
                            </div>
                            <div>
                              <span className="text-sm">{sa.firstName} {sa.lastName}</span>
                              {sa.officeName && (
                                <span className="text-xs text-muted-foreground ml-2">• {sa.officeName}</span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Certificate Type *</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CERTIFICATE_OF_SERVICE">Certificate of Service</SelectItem>
                    <SelectItem value="CERTIFICATE_OF_COMPLETION">Certificate of Completion</SelectItem>
                    <SelectItem value="CERTIFICATE_OF_EMPLOYMENT">Certificate of Employment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Certificate Title *</Label>
                <Input
                  placeholder="Certificate of Service"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Office Assigned */}
              <div className="space-y-2">
                <Label>Office Assigned</Label>
                <Input
                  placeholder="e.g., Office of the Registrar"
                  value={formOffice}
                  onChange={(e) => setFormOffice(e.target.value)}
                />
              </div>

              {/* Service Period */}
              <div className="space-y-2">
                <Label>Service Period</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Service Period Description</Label>
                <Input
                  placeholder="e.g., 2 semesters, 1 academic year"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                />
              </div>

              {/* Approving Authority */}
              <div className="space-y-2">
                <Label>Approving Authority *</Label>
                {userRole === "ADVISER" ? (
                  <div className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                    SA Adviser
                    <span className="ml-auto text-xs text-muted-foreground">(default for Adviser)</span>
                  </div>
                ) : (
                  <Select value={formAuthority} onValueChange={setFormAuthority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADVISER">SA Adviser</SelectItem>
                      <SelectItem value="PRESIDENT">University President</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIssueOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleIssueCertificate}
                disabled={isSubmitting || !selectedSA || !formTitle}
                className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Issuing...
                  </>
                ) : (
                  <>
                    <Award className="mr-2 h-4 w-4" />
                    Issue Certificate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Certificate Preview Modal ────────────────────────────────── */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Certificate Preview</DialogTitle>
            </DialogHeader>
            {certDetail && (
              <div className="space-y-4">
                {/* Certificate Visual */}
                <div className="relative rounded-lg border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-8 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/20 dark:border-amber-700">
                  {/* Gold border decoration */}
                  <div className="absolute inset-2 rounded border border-amber-300/50 dark:border-amber-700/50 pointer-events-none" />

                  <div className="relative text-center space-y-6">
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Award className="h-8 w-8 text-[#1e3a8a]" />
                        <h2 className="text-lg font-bold text-[#1e3a8a]">UNIVERSITY OF MAKATI</h2>
                      </div>
                      <p className="text-xs text-muted-foreground tracking-widest uppercase">
                        Student Assistant Management System
                      </p>
                      <div className="mx-auto h-0.5 w-32 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                    </div>

                    {/* Certificate Title */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">This is to certify that</p>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {certDetail.fullName}
                      </h3>
                      {certDetail.college && (
                        <p className="text-sm text-muted-foreground">{certDetail.college}</p>
                      )}
                    </div>

                    {/* Certificate Content */}
                    <div className="space-y-3 bg-white/60 rounded-lg p-6 dark:bg-slate-800/60">
                      <p className="text-sm">
                        has satisfactorily completed the requirements for
                      </p>
                      <div className="inline-block rounded-md bg-[#1e3a8a]/10 px-4 py-2">
                        <p className="text-base font-semibold text-[#1e3a8a]">
                          {certDetail.title}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        {certDetail.officeAssigned && (
                          <div>
                            <p className="text-xs text-muted-foreground">Office Assigned</p>
                            <p className="font-medium">{certDetail.officeAssigned}</p>
                          </div>
                        )}
                        {certDetail.servicePeriod && (
                          <div>
                            <p className="text-xs text-muted-foreground">Service Period</p>
                            <p className="font-medium">{certDetail.servicePeriod}</p>
                          </div>
                        )}
                        {certDetail.serviceStartDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Start Date</p>
                            <p className="font-medium">
                              {format(new Date(certDetail.serviceStartDate), "MMMM d, yyyy")}
                            </p>
                          </div>
                        )}
                        {certDetail.serviceEndDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">End Date</p>
                            <p className="font-medium">
                              {format(new Date(certDetail.serviceEndDate), "MMMM d, yyyy")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approving Authority */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Approved by</p>
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-center">
                          <p className="text-sm font-semibold">
                            {certDetail.approvedByName || authorityConfig[certDetail.approvingAuthority]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {certDetail.approvedByTitle || authorityConfig[certDetail.approvingAuthority]}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Date & Reference */}
                    <div className="flex items-center justify-between pt-4 border-t border-amber-200/50 dark:border-amber-700/50">
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">Date Issued</p>
                        <p className="text-sm font-medium">
                          {certDetail.dateIssued
                            ? format(new Date(certDetail.dateIssued), "MMMM d, yyyy")
                            : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Reference Number</p>
                        <p className="text-sm font-mono font-medium">{certDetail.referenceNumber}</p>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center pt-2">
                      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
                        {certDetail.qrCode ? (
                          <img src={certDetail.qrCode} alt="QR Verification Code" className="h-24 w-24" />
                        ) : (
                          <QrCode className="h-16 w-16 text-slate-400" />
                        )}
                        <p className="text-xs text-muted-foreground">QR Verification Code</p>
                        {certDetail.verificationUrl && (
                          <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {certDetail.verificationUrl}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Watermark */}
                    {certDetail.status !== "ACTIVE" && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className={`rounded-lg px-6 py-3 text-2xl font-bold uppercase tracking-wider ${
                            certDetail.status === "REVOKED"
                              ? "bg-red-500/10 text-red-500 border-2 border-red-500/30 rotate-[-15deg]"
                              : "bg-amber-500/10 text-amber-500 border-2 border-amber-500/30 rotate-[-15deg]"
                          }`}
                        >
                          {certDetail.status}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Certificate Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <Badge className={typeConfig[certDetail.type]?.color || ""} variant="secondary" mt-1>
                      {typeConfig[certDetail.type]?.label || certDetail.type}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={statusConfig[certDetail.status]?.color || ""} variant="secondary" mt-1>
                      {statusConfig[certDetail.status]?.label || certDetail.status}
                    </Badge>
                  </div>
                  {certDetail.studentNumber && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Student Number</p>
                      <p className="font-medium">{certDetail.studentNumber}</p>
                    </div>
                  )}
                  {certDetail.program && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Program</p>
                      <p className="font-medium">{certDetail.program}</p>
                    </div>
                  )}
                </div>

                {/* Revocation Info */}
                {certDetail.status === "REVOKED" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Revocation Details</h4>
                    </div>
                    {certDetail.revokeReason && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                        Reason: {certDetail.revokeReason}
                      </p>
                    )}
                    {certDetail.revokedAt && (
                      <p className="mt-1 text-xs text-red-500">
                        Revoked on: {format(new Date(certDetail.revokedAt), "MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 border-t pt-4">
                  {canRevoke && certDetail.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                      onClick={() => {
                        setPreviewOpen(false);
                        setSelectedCert(certDetail);
                        setRevokeOpen(true);
                      }}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Revoke Certificate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleGenerateCertificate(certDetail)}
                  >
                    <FileCheck className="mr-2 h-4 w-4" />
                    Generate Certificate
                  </Button>
                  <Button
                    className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                    onClick={() => handleDownload(certDetail)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Revoke Confirmation ───────────────────────────────────────── */}
        <AlertDialog open={revokeOpen} onOpenChange={(open) => { setRevokeOpen(open); if (!open) setRevokeReason(""); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Certificate</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revoke this certificate? This action will mark the
                certificate as invalid and cannot be easily undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="revoke-reason">Reason for revocation *</Label>
              <Textarea
                id="revoke-reason"
                placeholder="Please provide a reason for revoking this certificate..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeCertificate}
                disabled={isRevoking || !revokeReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Revoke Certificate
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
