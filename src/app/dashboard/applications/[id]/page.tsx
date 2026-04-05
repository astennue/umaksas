"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  FileText,
  CalendarDays,
  Users,
  Clock,
  BookOpen,
  IdCard,
  Building2,
  CalendarClock,
  Eye,
} from "lucide-react";
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface ApplicationData {
  id: string;
  applicantEmail: string;
  userId: string | null;
  status: string;
  currentStep: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Personal
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  gender: string | null;
  civilStatus: string | null;
  religion: string | null;
  citizenship: string | null;
  // Contact
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  // Residence
  residenceAddress: string | null;
  residenceCity: string | null;
  residenceZip: string | null;
  // Family
  fatherName: string | null;
  fatherOccupation: string | null;
  fatherContact: string | null;
  motherName: string | null;
  motherMaidenName: string | null;
  motherOccupation: string | null;
  motherContact: string | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianContact: string | null;
  siblingsCount: number | null;
  // Education
  elementarySchool: string | null;
  elementaryYear: string | null;
  highSchool: string | null;
  highSchoolYear: string | null;
  seniorHigh: string | null;
  seniorHighYear: string | null;
  seniorHighTrack: string | null;
  // Current
  studentNumber: string | null;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  section: string | null;
  gwa: string | null;
  // JSON
  employmentJson: string | null;
  availabilityJson: string | null;
  trainingsJson: string | null;
  referencesJson: string | null;
  // Essays
  essayWhyApply: string | null;
  essayGoals: string | null;
  essaySkills: string | null;
  essayChallenges: string | null;
  // Uploads
  photoUrl: string | null;
  resumeUrl: string | null;
  gradeReportUrl: string | null;
  registrationUrl: string | null;
  residenceImageUrl: string | null;
  // Review
  reviewNotes: string | null;
  interviewStatus: string;
  interviewScore: number | null;
  interviewDate: string | null;
  interviewNotes: string | null;
  totalScore: number | null;
  rank: number | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-violet-100 text-violet-700" },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", color: "bg-cyan-100 text-cyan-700" },
  INTERVIEWED: { label: "Interviewed", color: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

function JsonSection({ title, data }: { title: string; data: unknown }) {
  const [parsed, setParsed] = useState<Array<Record<string, unknown>> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!data) {
      setParsed(null);
      setError(false);
      return;
    }
    try {
      const p = typeof data === "string" ? JSON.parse(data) : data;
      if (Array.isArray(p) && p.length > 0) {
        setParsed(p);
        setError(false);
      } else {
        setParsed(null);
      }
    } catch {
      setParsed(null);
      setError(true);
    }
  }, [data]);

  if (!parsed || error) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      {parsed.map((item, idx) => (
        <div key={idx} className="rounded-lg border bg-gray-50 dark:bg-gray-900/50 p-3">
          {Object.entries(item).map(([k, v]) => {
            if (!v) return null;
            return (
              <div key={k} className="flex justify-between py-0.5">
                <span className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                <span className="text-xs font-medium text-right max-w-[60%] break-words">{String(v)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{url: string; label: string; type: string} | null>(null);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = ["SUPER_ADMIN", "ADVISER", "OFFICER", "HRMO"].includes(userRole || "");
  const canReview = ["SUPER_ADMIN", "ADVISER"].includes(userRole || "");

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/applications/${params.id}`);
      if (res.status === 404) {
        toast.error("Application not found");
        router.push("/dashboard/applications");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch application");
      const data = await res.json();
      setApp(data.application);
    } catch (error) {
      console.error("Error fetching application:", error);
      toast.error("Failed to load application");
      router.push("/dashboard/applications");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (session) fetchApplication();
  }, [session, fetchApplication]);

  const handleDownloadPdf = async () => {
    if (!app) return;
    try {
      const res = await fetch(`/api/applications/${app.id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `application-${app.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to download PDF");
    }
  };

  const handleViewDocument = (url: string, label: string) => {
    if (!url) return;

    if (url.startsWith('data:')) {
      const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
      const isImage = mimeType.startsWith('image/');

      if (isImage) {
        // Show in preview dialog
        setDocumentPreview({ url, label, type: mimeType });
      } else {
        // Download document
        const extension = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('word') || mimeType.includes('document') ? 'docx' : 'bin';
        const byteString = atob(url.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${label.replace(/\s+/g, '_')}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    if (!app) return;
    setActionLoading(status);
    try {
      const res = await fetch("/api/applications/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${status.toLowerCase()} application`);
      }
      toast.success(`Application ${status.toLowerCase()} successfully`);
      fetchApplication();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (!session || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Application not found</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/applications">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Applications
          </Link>
        </Button>
      </div>
    );
  }

  const fullName = [app.firstName, app.middleName ? `${app.middleName.charAt(0)}.` : null, app.lastName, app.suffix]
    .filter(Boolean).join(" ").trim() || app.applicantEmail;
  const statusInfo = statusConfig[app.status] || statusConfig.DRAFT;

  const trackingRef = app.id.slice(0, 8).toUpperCase();

  // Rejection dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [revertOpen, setRevertOpen] = useState(false);

  const handleReject = async () => {
    if (!app || !rejectRemarks.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActionLoading("REJECTED");
    try {
      const res = await fetch("/api/applications/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id, status: "REJECTED", reviewNotes: rejectRemarks.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject application");
      }
      toast.success("Application rejected successfully");
      setRejectOpen(false);
      setRejectRemarks("");
      fetchApplication();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevertStatus = async (newStatus: string) => {
    if (!app) return;
    setActionLoading(newStatus);
    try {
      const res = await fetch("/api/applications/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id, status: newStatus, reviewNotes: `Status reverted from ${app.status} to ${newStatus}` }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revert status");
      }
      toast.success(`Application status reverted to ${newStatus.replace(/_/g, " ")}`);
      setRevertOpen(false);
      fetchApplication();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/applications">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Application
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Application Details | {app.lastName?.toUpperCase() || "UNKNOWN"}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{fullName} &middot; {app.applicantEmail}</span>
            <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">Ref: {trackingRef}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-1.5">
              <Download className="h-4 w-4" /> PDF
            </Button>
          )}
          {isAdmin && !["APPROVED", "REJECTED", "WITHDRAWN"].includes(app.status) && (
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} className="gap-1.5">
              <CalendarClock className="h-4 w-4" /> Interview
            </Button>
          )}
          {canReview && !["APPROVED", "REJECTED", "WITHDRAWN"].includes(app.status) && (
            <>
              <Button
                size="sm"
                onClick={() => handleAction("APPROVED")}
                disabled={!!actionLoading}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading === "APPROVED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={!!actionLoading}
                className="gap-1.5"
              >
                {actionLoading === "REJECTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </Button>
            </>
          )}
          {canReview && (app.status === "REJECTED" || app.status === "APPROVED") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRevertOpen(true)}
              disabled={!!actionLoading}
              className="gap-1.5"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
              Revert Status
            </Button>
          )}
        </div>
      </div>

      {/* Applicant Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="h-16 w-16 rounded-full border-2 border-white dark:border-gray-800 shadow-md overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
              {app.photoUrl ? (
                <img src={app.photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-500">
                  <User className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white break-words">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge className={statusInfo.color} variant="secondary">{statusInfo.label}</Badge>
                {app.studentNumber && <Badge variant="outline" className="text-xs"><IdCard className="mr-1 h-3 w-3" />{app.studentNumber}</Badge>}
                {app.college && <Badge variant="outline" className="text-xs"><GraduationCap className="mr-1 h-3 w-3" />{app.college}</Badge>}
                {app.program && <Badge variant="outline" className="text-xs">{app.program}</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{app.email || app.applicantEmail}</span>
                {app.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.phone}</span>}
                <span>Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="personal" className="gap-1.5"><User className="h-3.5 w-3.5" /> Personal</TabsTrigger>
          <TabsTrigger value="family" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Family</TabsTrigger>
          <TabsTrigger value="education" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Education</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
          <TabsTrigger value="essays" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Essays</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-600" /> Education</h4>
                  <InfoRow label="College" value={app.college} />
                  <InfoRow label="Program" value={app.program} />
                  <InfoRow label="Year Level" value={app.yearLevel} />
                  <InfoRow label="Section" value={app.section} />
                  <InfoRow label="Student No." value={app.studentNumber} />
                  <InfoRow label="GWA" value={app.gwa} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Phone className="h-4 w-4 text-green-600" /> Contact</h4>
                  <InfoRow label="Email" value={app.email || app.applicantEmail} />
                  <InfoRow label="Phone" value={app.phone} />
                  <InfoRow label="Alt. Phone" value={app.alternatePhone} />
                  <InfoRow label="Address" value={app.residenceAddress} />
                  <InfoRow label="City" value={app.residenceCity} />
                  <InfoRow label="Zip" value={app.residenceZip} />
                </div>
              </div>
              {app.reviewNotes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-amber-700">Review Notes</h4>
                    <p className="text-sm text-muted-foreground">{app.reviewNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-1">
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow label="Date of Birth" value={app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null} />
              <InfoRow label="Place of Birth" value={app.placeOfBirth} />
              <InfoRow label="Sex" value={app.gender} />
              <InfoRow label="Civil Status" value={app.civilStatus} />
              <InfoRow label="Citizenship" value={app.citizenship} />
              <InfoRow label="Religion" value={app.religion} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-blue-700">Father</h4>
                <InfoRow label="Name" value={app.fatherName} />
                <InfoRow label="Occupation" value={app.fatherOccupation} />
                <InfoRow label="Contact" value={app.fatherContact} />
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 text-blue-700">Mother</h4>
                <InfoRow label="Name" value={app.motherName} />
                <InfoRow label="Maiden Name" value={app.motherMaidenName} />
                <InfoRow label="Occupation" value={app.motherOccupation} />
                <InfoRow label="Contact" value={app.motherContact} />
              </div>
              {app.guardianName && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-blue-700">Guardian</h4>
                    <InfoRow label="Name" value={app.guardianName} />
                    <InfoRow label="Relationship" value={app.guardianRelation} />
                    <InfoRow label="Contact" value={app.guardianContact} />
                    <InfoRow label="Siblings" value={app.siblingsCount?.toString()} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-green-700">Elementary</h4>
                <InfoRow label="School" value={app.elementarySchool} />
                <InfoRow label="Year Graduated" value={app.elementaryYear} />
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 text-blue-700">High School</h4>
                <InfoRow label="School" value={app.highSchool} />
                <InfoRow label="Year Graduated" value={app.highSchoolYear} />
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 text-purple-700">Senior High School</h4>
                <InfoRow label="School" value={app.seniorHigh} />
                <InfoRow label="Year Graduated" value={app.seniorHighYear} />
                <InfoRow label="Strand/Track" value={app.seniorHighTrack} />
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 text-amber-700">Current</h4>
                <InfoRow label="College" value={app.college} />
                <InfoRow label="Program" value={app.program} />
                <InfoRow label="Year Level" value={app.yearLevel} />
                <InfoRow label="GWA" value={app.gwa} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              {app.availabilityJson ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Weekly Availability</h4>
                  {(() => {
                    try {
                      const avail = JSON.parse(app.availabilityJson) as Record<string, string[]>;
                      const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
                      const labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                      return days.map((d, i) => {
                        const slots = avail[d] || [];
                        return (
                          <div key={d} className="flex items-start gap-3 py-2 border-b last:border-0">
                            <span className="text-sm font-medium w-28 text-muted-foreground">{labels[i]}</span>
                            <div className="flex flex-wrap gap-1">
                              {slots.length > 0 ? slots.map((s, j) => (
                                <Badge key={j} variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{s}</Badge>
                              )) : <span className="text-xs text-muted-foreground">Not available</span>}
                            </div>
                          </div>
                        );
                      });
                    } catch { return <p className="text-sm text-muted-foreground">Availability data unavailable</p>; }
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No availability data provided</p>
              )}
              <JsonSection title="Employment History" data={app.employmentJson} />
              <JsonSection title="Trainings & Seminars" data={app.trainingsJson} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Essays Tab */}
        <TabsContent value="essays">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              {app.essayWhyApply && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Why do you want to become a Student Assistant?</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.essayWhyApply}</p>
                </div>
              )}
              <Separator />
              {app.essayGoals && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">What are your goals as a Student Assistant?</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.essayGoals}</p>
                </div>
              )}
              <Separator />
              {app.essaySkills && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">What skills can you contribute?</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.essaySkills}</p>
                </div>
              )}
              <Separator />
              {app.essayChallenges && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">How do you plan to balance academics and SA duties?</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.essayChallenges}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${app.photoUrl ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">2x2 ID Photo</p>
                    <p className="text-xs text-muted-foreground">{app.photoUrl ? "Submitted" : "Not submitted"}</p>
                  </div>
                  {app.photoUrl && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewDocument(app.photoUrl!, "2x2_ID_Photo")}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${app.resumeUrl ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Resume/CV</p>
                    <p className="text-xs text-muted-foreground">{app.resumeUrl ? "Submitted" : "Not submitted"}</p>
                  </div>
                  {app.resumeUrl && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewDocument(app.resumeUrl!, "Resume_CV")}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${app.gradeReportUrl ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Grade Report</p>
                    <p className="text-xs text-muted-foreground">{app.gradeReportUrl ? "Submitted" : "Not submitted"}</p>
                  </div>
                  {app.gradeReportUrl && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewDocument(app.gradeReportUrl!, "Grade_Report")}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${app.registrationUrl ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Registration Form</p>
                    <p className="text-xs text-muted-foreground">{app.registrationUrl ? "Submitted" : "Not submitted"}</p>
                  </div>
                  {app.registrationUrl && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewDocument(app.registrationUrl!, "Registration_Form")}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                  )}
                </div>
              </div>
              {app.referencesJson && (
                <div className="mt-6">
                  <JsonSection title="Character References" data={app.referencesJson} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        applicationId={app.id}
        applicantName={fullName}
        onScheduled={fetchApplication}
      />

      {/* Document Preview Dialog */}
      <Dialog open={!!documentPreview} onOpenChange={(open) => { if (!open) setDocumentPreview(null); }}>
        <DialogContent className="max-w-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{documentPreview?.label || 'Document Preview'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {documentPreview && documentPreview.type.startsWith('image/') && (
              <img
                src={documentPreview.url}
                alt={documentPreview.label}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Confirmation Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Application
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to reject the application from <strong>{fullName}</strong>? This action can be reverted later.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection <span className="text-red-500">*</span></label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Provide the reason for rejecting this application..."
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectRemarks(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!actionLoading || !rejectRemarks.trim()}
              className="gap-1.5"
            >
              {actionLoading === "REJECTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Status Dialog */}
      <Dialog open={revertOpen} onOpenChange={setRevertOpen}>
        <DialogContent className="border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              Revert Application Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Current status: <Badge variant="secondary" className={statusInfo.color}>{statusInfo.label}</Badge>
            </p>
            <p className="text-sm text-muted-foreground">
              Select a new status for this application:
            </p>
            <div className="grid gap-2">
              {app.status === "REJECTED" && (
                <Button
                  variant="outline"
                  className="justify-start gap-2 h-12"
                  onClick={() => handleRevertStatus("UNDER_REVIEW")}
                  disabled={!!actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <div>
                    <p className="text-sm font-medium">Under Review</p>
                    <p className="text-xs text-muted-foreground">Return to review process</p>
                  </div>
                </Button>
              )}
              <Button
                variant="outline"
                className="justify-start gap-2 h-12"
                onClick={() => handleRevertStatus("SUBMITTED")}
                disabled={!!actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <div>
                  <p className="text-sm font-medium">Submitted</p>
                  <p className="text-xs text-muted-foreground">Revert to initial submitted state</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 h-12"
                onClick={() => handleRevertStatus("INTERVIEW_SCHEDULED")}
                disabled={!!actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <div>
                  <p className="text-sm font-medium">Interview Scheduled</p>
                  <p className="text-xs text-muted-foreground">Set for interview phase</p>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
