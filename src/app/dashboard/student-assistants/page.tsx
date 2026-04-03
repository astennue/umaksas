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
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Building2,
  GraduationCap,
  Clock,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SAFormModal } from "@/components/dashboard/sa-form-modal";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";
import { RoleGuard } from "@/components/auth/role-guard";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/hooks/use-confirm";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface StudentAssistant {
  id: string;
  profileId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  isActive: boolean;
  studentNumber: string | null;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  status: string;
  officeId: string | null;
  officeName: string | null;
  officeCode: string | null;
  isOnDuty: boolean;
  lastClockIn: string | null;
  totalHoursWorked: number;
  hoursThisSemester: number;
  dateHired: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  ARCHIVED: { label: "Archived", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  COMPLETED: { label: "Completed", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  RESIGNED: { label: "Resigned", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  DISMISSED: { label: "Dismissed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  OTHER: { label: "Other", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500" },
};

export default function StudentAssistantsPage() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<StudentAssistant[]>([]);
  const [offices, setOffices] = useState<{ id: string; name: string; code: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editSA, setEditSA] = useState<StudentAssistant | null>(null);
  const [detailSA, setDetailSA] = useState<StudentAssistant | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Confirmation dialog
  const { confirm, ConfirmDialog } = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const canManage = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");
  const canCreate = ["SUPER_ADMIN", "ADVISER"].includes(userRole || "");
  const canDelete = userRole === "SUPER_ADMIN";

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);
      if (collegeFilter !== "all") params.set("college", collegeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/student-assistants?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch student assistants");
      const data = await res.json();
      setStudents(data.studentAssistants || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching SAs:", error);
      toast.error("Failed to load student assistants");
    } finally {
      setLoading(false);
    }
  }, [page, search, collegeFilter, statusFilter]);

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices");
      if (!res.ok) return;
      const data = await res.json();
      setOffices((data.offices || []).map((o: { id: string; name: string; code: string | null }) => ({
        id: o.id,
        name: o.name,
        code: o.code,
      })));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchOffices();
  }, [fetchStudents, fetchOffices]);

  // Keyboard shortcut: "/" to focus search input
  useKeyboardShortcuts({
    "/": () => {
      const searchInput = document.querySelector<HTMLInputElement>("input[placeholder*='Search']");
      searchInput?.focus();
    },
  });

  // Get unique colleges from loaded students
  const colleges = Array.from(
    new Set(students.map((s) => s.college).filter(Boolean) as string[])
  ).sort();

  if (loading && students.length === 0) {
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
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}>
    <div className="space-y-6">
      {/* Page Header */}
      <CRUDToolbar
        title="Student Assistants"
        entityLabel="Student Assistants"
        onAdd={canCreate ? () => { setEditSA(null); setFormOpen(true); } : undefined}
        onSearch={(value) => { setSearch(value); setPage(1); }}
        showAdd={!!canCreate}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total SAs", count: total, color: "text-slate-900 dark:text-white" },
          { label: "Active", count: students.filter((s) => s.status === "ACTIVE").length, color: "text-green-600" },
          { label: "On Duty", count: students.filter((s) => s.isOnDuty).length, color: "text-blue-600" },
          { label: "Offices", count: new Set(students.map((s) => s.officeName).filter(Boolean)).size, color: "text-violet-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-3 dark:bg-slate-800">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search moved to CRUDToolbar */}
          {colleges.length > 0 && (
            <Select value={collegeFilter} onValueChange={(v) => { setCollegeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <GraduationCap className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Colleges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {colleges.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="RESIGNED">Resigned</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SA Cards */}
      {students.length === 0 ? (
        <div className="rounded-lg border bg-white dark:bg-slate-800">
          <EmptyState
            icon={Users}
            title="No student assistants found"
            description={
              search || collegeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first student assistant to get started"
            }
            action={
              canCreate
                ? { label: "Add Student Assistant", onClick: () => { setEditSA(null); setFormOpen(true); } }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((sa) => {
            const fullName = `${sa.firstName} ${sa.lastName}`.trim();
            const config = statusConfig[sa.status] || statusConfig.OTHER;

            return (
              <Card
                key={sa.id}
                className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {/* On-duty indicator bar */}
                {sa.isOnDuty && (
                  <div className="h-1 bg-green-500" />
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-sm font-semibold">
                        {sa.firstName.charAt(0)}{sa.lastName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate">{fullName}</h3>
                        <p className="text-xs text-muted-foreground truncate">{sa.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={config.color} variant="secondary">
                        {sa.isOnDuty && (
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                        {config.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    {sa.college && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GraduationCap className="h-3 w-3 shrink-0" />
                        <span className="truncate">{sa.college}</span>
                      </div>
                    )}
                    {sa.officeName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{sa.officeName}</span>
                      </div>
                    )}
                    {sa.program && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserCheck className="h-3 w-3 shrink-0" />
                        <span className="truncate">{sa.program} {sa.yearLevel ? `• ${sa.yearLevel}yr` : ""}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-1 border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setDetailSA(sa); setDetailOpen(true); }}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setEditSA(sa); setFormOpen(true); }}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                        disabled={isDeleting}
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: "Archive Student Assistant",
                            description: `Are you sure you want to archive ${sa.firstName} ${sa.lastName}? This will deactivate their account and mark their profile as archived. This action can be reversed by editing their status.`,
                            confirmText: "Archive",
                            variant: "destructive",
                          });
                          if (!confirmed) return;
                          setIsDeleting(true);
                          try {
                            const res = await fetch(`/api/student-assistants/${sa.id}`, { method: "DELETE" });
                            if (!res.ok) {
                              const data = await res.json();
                              throw new Error(data.error || "Failed to remove student assistant");
                            }
                            toast.success("Student assistant archived");
                            fetchStudents();
                          } catch (error: unknown) {
                            toast.error(error instanceof Error ? error.message : "Failed to remove student assistant");
                          } finally {
                            setIsDeleting(false);
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {isDeleting ? "Archiving..." : "Remove"}
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
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Assistant Details</DialogTitle>
          </DialogHeader>
          {detailSA && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xl font-bold">
                  {detailSA.firstName.charAt(0)}{detailSA.lastName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold break-words">
                    {`${detailSA.firstName} ${detailSA.lastName}`.trim()}
                  </h3>
                  <p className="text-sm text-muted-foreground break-words truncate">{detailSA.email}</p>
                  <Badge className={statusConfig[detailSA.status]?.color || ""} variant="secondary" mt-1>
                    {detailSA.isOnDuty && (
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                    {statusConfig[detailSA.status]?.label || detailSA.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {detailSA.studentNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-28">Student No.</span>
                    <span>{detailSA.studentNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{detailSA.phone || "No phone"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="break-words">{detailSA.college || "No college"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span>{detailSA.program || "No program"} {detailSA.yearLevel ? `• Year ${detailSA.yearLevel}` : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="break-words">{detailSA.officeName || "No office assigned"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {detailSA.dateHired
                      ? `Hired: ${format(new Date(detailSA.dateHired), "MMM d, yyyy")}`
                      : "Date hired not set"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Total: {detailSA.totalHoursWorked.toFixed(1)}h • This semester: {detailSA.hoursThisSemester.toFixed(1)}h
                  </span>
                </div>
              </div>

              {canManage && (
                <div className="flex gap-2 border-t pt-4">
                  <Button
                    className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                    onClick={() => {
                      setDetailOpen(false);
                      setEditSA(detailSA);
                      setFormOpen(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Details
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form */}
      <SAFormModal
        sa={editSA ? {
          id: editSA.id,
          firstName: editSA.firstName,
          lastName: editSA.lastName,
          email: editSA.email,
          phone: editSA.phone || undefined,
          college: editSA.college,
          program: editSA.program,
          yearLevel: editSA.yearLevel,
          officeId: editSA.officeId,
          status: editSA.status,
        } : null}
        offices={offices}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchStudents}
        mode={editSA ? "edit" : "add"}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
    </RoleGuard>
  );
}
