"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserPlus,
  Users,
  Shield,
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { RoleGuard } from "@/components/auth/role-guard";
import { AddUserDialog } from "@/components/dashboard/add-user-dialog";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { safeJsonParse } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  officerPosition: string | null;
  saCollege: string | null;
  saProgram: string | null;
  saYearLevel: string | null;
  saStatus: string | null;
}

const roleConfig: Record<string, { label: string; color: string; icon: typeof Users }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: Shield,
  },
  ADVISER: {
    label: "Adviser",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: Shield,
  },
  OFFICER: {
    label: "Officer",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Award,
  },
  STUDENT_ASSISTANT: {
    label: "Student Assistant",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: GraduationCap,
  },
  OFFICE_SUPERVISOR: {
    label: "Office Supervisor",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    icon: Users,
  },
  HRMO: {
    label: "HRMO",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    icon: Shield,
  },
};

function formatPosition(pos: string): string {
  return pos.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ManageUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await safeJsonParse<any>(res);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserCreated = () => {
    setPage(1);
    fetchUsers();
  };

  const fullName = (u: UserRow) =>
    `${u.firstName} ${u.middleName ? u.middleName + " " : ""}${u.lastName}`.trim();

  // Stats
  const totalActive = users.filter((u) => u.isActive).length;
  const totalInactive = users.filter((u) => !u.isActive).length;

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]} presidentOnly>
      <div className="space-y-6">
        {/* Header */}
        <CRUDToolbar
          title="Manage Users"
          entityLabel="Users"
          onAdd={() => setAddDialogOpen(true)}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search by name or email..."
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Users", count: total, color: "text-slate-900 dark:text-white" },
            { label: "Active", count: totalActive, color: "text-green-600" },
            { label: "Inactive", count: totalInactive, color: "text-red-600" },
            { label: "This Page", count: users.length, color: "text-blue-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-white p-3 dark:bg-slate-800">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-3">
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <Users className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              <SelectItem value="ADVISER">Adviser</SelectItem>
              <SelectItem value="OFFICER">Officer</SelectItem>
              <SelectItem value="STUDENT_ASSISTANT">Student Assistant</SelectItem>
              <SelectItem value="OFFICE_SUPERVISOR">Office Supervisor</SelectItem>
              <SelectItem value="HRMO">HRMO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border bg-white dark:bg-slate-800">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-lg font-semibold text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || roleFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first user to get started"}
              </p>
              {!search && roleFilter === "all" && (
                <Button
                  onClick={() => setAddDialogOpen(true)}
                  className="mt-4 gap-1.5 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                >
                  <UserPlus className="h-4 w-4" />
                  Add New User
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-white dark:bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead className="w-[30%]">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const config = roleConfig[u.role] || {
                      label: u.role,
                      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
                      icon: Users,
                    };
                    const Icon = config.icon;

                    return (
                      <TableRow key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        {/* Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                              {u.firstName?.charAt(0) || "?"}
                              {u.lastName?.charAt(0) || ""}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{fullName(u)}</p>
                              <div className="flex items-center gap-2">
                                {u.officerPosition && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                    {formatPosition(u.officerPosition)}
                                  </span>
                                )}
                                {u.saCollege && (
                                  <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                    {u.saCollege}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground truncate">{u.email}</span>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Badge variant="secondary" className={`text-[11px] ${config.color}`}>
                            <Icon className="h-3 w-3 mr-0.5" />
                            {config.label}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {u.isActive ? (
                            <Badge
                              variant="secondary"
                              className="text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[11px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            >
                              <XCircle className="h-3 w-3 mr-0.5" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>

                        {/* Created */}
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(u.createdAt), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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

        {/* Add User Dialog */}
        <AddUserDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onUserCreated={handleUserCreated}
        />
      </div>
    </RoleGuard>
  );
}
