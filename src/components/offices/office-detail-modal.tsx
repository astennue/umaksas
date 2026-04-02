"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Mail,
  Phone,
  User,
  Users,
  Clock,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export interface AssignedSA {
  id: string;
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  status: string;
  isOnDuty: boolean;
  totalHoursWorked: number;
  dateHired: string | null;
}

export interface OfficeDetail {
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
    phone: string | null;
    photoUrl: string | null;
    role: string;
  } | null;
  maxSACount: number;
  currentSACount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedSAs: AssignedSA[];
  saRequests: {
    id: string;
    requestedCount: number;
    reason: string | null;
    requirements: string | null;
    preferredSkills: string | null;
    status: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    createdAt: string;
  }[];
}

interface OfficeDetailModalProps {
  officeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (office: OfficeDetail) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

export function OfficeDetailModal({ officeId, open, onOpenChange, onEdit }: OfficeDetailModalProps) {
  const [office, setOffice] = useState<OfficeDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!officeId || !open) {
      setOffice(null);
      return;
    }

    async function fetchOffice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/offices/${officeId}`);
        if (!res.ok) throw new Error("Failed to fetch office");
        const data = await res.json();
        setOffice(data);
      } catch (error) {
        console.error("Error fetching office:", error);
        toast.error("Failed to load office details");
      } finally {
        setLoading(false);
      }
    }

    fetchOffice();
  }, [officeId, open]);

  const saPercentage = office ? (office.currentSACount / office.maxSACount) * 100 : 0;
  const progressColor =
    saPercentage >= 100 ? "bg-red-500" : saPercentage >= 80 ? "bg-amber-500" : "bg-green-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[90vh]">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-40 rounded-lg mt-4" />
            </div>
          ) : office ? (
            <div>
              {/* Header */}
              <div className="p-6 pb-4">
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-xl">{office.name}</DialogTitle>
                        {office.code && (
                          <Badge variant="secondary" className="bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs">
                            {office.code}
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className={
                            office.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }
                        >
                          {office.isActive ? "Active" : "Archived"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {format(new Date(office.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onEdit(office);
                          onOpenChange(false);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </DialogHeader>

                {office.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3 break-words">{office.description}</p>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {office.location && (
                    <div className="flex items-center gap-2 text-sm rounded-lg border p-3 min-w-0">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{office.location}</span>
                    </div>
                  )}
                  {office.email && (
                    <div className="flex items-center gap-2 text-sm rounded-lg border p-3 min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{office.email}</span>
                    </div>
                  )}
                  {office.phone && (
                    <div className="flex items-center gap-2 text-sm rounded-lg border p-3 min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{office.phone}</span>
                    </div>
                  )}
                  {office.headName && (
                    <div className="flex items-center gap-2 text-sm rounded-lg border p-3 min-w-0">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{office.headName}</span>
                    </div>
                  )}
                </div>

                {/* SA Capacity */}
                <div className="mt-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">SA Capacity</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {office.currentSACount} / {office.maxSACount} assigned
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor}`}
                      style={{ width: `${Math.min(saPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Assigned SAs */}
              <div className="p-6">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Student Assistants ({office.assignedSAs.length})
                </h3>
                {office.assignedSAs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mt-2">No student assistants assigned</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {office.assignedSAs.map((sa) => {
                      const fullName = `${sa.firstName || ""} ${sa.lastName || ""}`.trim() || sa.email;
                      return (
                        <div
                          key={sa.id}
                          className="flex items-center gap-3 rounded-lg border p-3 min-w-0"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-semibold">
                            {(sa.firstName?.charAt(0) || "")}{(sa.lastName?.charAt(0) || "")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{fullName}</p>
                              {sa.isOnDuty && (
                                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {sa.college || sa.program || sa.email}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SA Requests */}
              {office.saRequests.length > 0 && (
                <>
                  <Separator />
                  <div className="p-6">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Recent SA Requests ({office.saRequests.length})
                    </h3>
                    <div className="space-y-2">
                      {office.saRequests.slice(0, 5).map((req) => {
                        const config = statusConfig[req.status] || statusConfig.PENDING;
                        return (
                          <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium truncate">
                                  Request for {req.requestedCount} SA{req.requestedCount > 1 ? "s" : ""}
                                </span>
                                <Badge className={`${config.color} text-xs`} variant="secondary">
                                  {config.label}
                                </Badge>
                              </div>
                              {req.reason && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {req.reason}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(req.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            {req.status === "PENDING" && (
                              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            {req.status === "APPROVED" && (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            )}
                            {req.status === "REJECTED" && (
                              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
