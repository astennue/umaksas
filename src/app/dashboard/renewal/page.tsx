"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText,
  Building2,
  CheckCircle2,
  Upload,
  X,
  FileIcon,
  Loader2,
  AlertTriangle,
  CalendarCheck,
  Info,
  RefreshCw,
  ImageIcon,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AvailabilityGrid } from "@/components/apply/availability-grid";
import { TOTAL_SLOTS } from "@/lib/validations/application";

interface SystemSettings {
  renewalOpen: boolean;
  academicYear: string;
  currentSemester: string;
}

interface RenewalData {
  id: string;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
  submittedAt: string | null;
  academicYear: string | null;
  semester: string | null;
  availabilityJson: string | null;
  requestTransfer: boolean;
  transferReason: string | null;
  newOfficeId: string | null;
  intentLetterUrl: string | null;
  reportOfGradeUrl: string | null;
  corUrl: string | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    profile?: {
      college: string | null;
      program: string | null;
      office?: { name: string; code: string; id: string } | null;
    };
  };
  newOffice?: { id: string; name: string; code: string } | null;
}

interface Office {
  id: string;
  name: string;
  code: string;
}

const STEPS = [
  { id: 1, title: "Weekly Availability", icon: Clock, shortTitle: "Availability" },
  { id: 2, title: "Upload Documents", icon: FileText, shortTitle: "Documents" },
  { id: 3, title: "Office Transfer", icon: Building2, shortTitle: "Transfer" },
  { id: 4, title: "Review & Submit", icon: CheckCircle2, shortTitle: "Submit" },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_REVIEW: { label: "Pending Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Clock },
  UNDER_REVIEW: { label: "Under Review", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: FileText },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: X },
  REQUIRES_CHANGES: { label: "Requires Changes", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: AlertTriangle },
};

export default function RenewalPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const user = session?.user as { id: string; role: string; firstName?: string } | undefined;

  // State
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [existingRenewal, setExistingRenewal] = useState<RenewalData | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [availability, setAvailability] = useState<boolean[]>(Array(TOTAL_SLOTS).fill(false));
  const [requestTransfer, setRequestTransfer] = useState(false);
  const [transferReason, setTransferReason] = useState("");
  const [newOfficeId, setNewOfficeId] = useState("");
  const [intentLetterUrl, setIntentLetterUrl] = useState("");
  const [reportOfGradeUrl, setReportOfGradeUrl] = useState("");
  const [corUrl, setCorUrl] = useState("");
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Upload states
  const [uploadingIntent, setUploadingIntent] = useState(false);
  const [uploadingGrade, setUploadingGrade] = useState(false);
  const [uploadingCor, setUploadingCor] = useState(false);

  // Check if user is SA
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/portal-login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (user && user.role !== "STUDENT_ASSISTANT") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Fetch initial data
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        const [settingsRes, renewalsRes, officesRes] = await Promise.all([
          fetch("/api/system-settings"),
          fetch("/api/renewals"),
          fetch("/api/offices?isActive=true&limit=100"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);
        }

        if (renewalsRes.ok) {
          const data = await renewalsRes.json();
          if (data.renewals && data.renewals.length > 0) {
            setExistingRenewal(data.renewals[0]);
          }
        }

        if (officesRes.ok) {
          const data = await officesRes.json();
          setOffices(data.offices || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Load existing renewal data when editing
  useEffect(() => {
    if (existingRenewal && existingRenewal.status === "REQUIRES_CHANGES") {
      if (existingRenewal.availabilityJson) {
        try {
          const parsed = JSON.parse(existingRenewal.availabilityJson);
          if (Array.isArray(parsed)) {
            setAvailability(parsed.length === TOTAL_SLOTS ? parsed : Array(TOTAL_SLOTS).fill(false));
          } else {
            // Handle object format { Mon: [7,8,...], ... }
            const arr = Array(TOTAL_SLOTS).fill(false) as boolean[];
            const SLOTS_PER_DAY = 22;
            const DAYS_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
            DAYS_KEYS.forEach((day, dayIdx) => {
              const slots = parsed[day] || [];
              if (Array.isArray(slots)) {
                slots.forEach((hour: number) => {
                  const timeIdx = (hour - 7) * 2; // 7am = index 0, 7:30 = index 1, etc.
                  if (timeIdx >= 0 && timeIdx < SLOTS_PER_DAY) {
                    arr[dayIdx * SLOTS_PER_DAY + timeIdx] = true;
                  }
                });
              }
            });
            setAvailability(arr);
          }
        } catch {
          setAvailability(Array(TOTAL_SLOTS).fill(false));
        }
      }
      setRequestTransfer(existingRenewal.requestTransfer);
      setTransferReason(existingRenewal.transferReason || "");
      setNewOfficeId(existingRenewal.newOfficeId || "");
      setIntentLetterUrl(existingRenewal.intentLetterUrl || "");
      setReportOfGradeUrl(existingRenewal.reportOfGradeUrl || "");
      setCorUrl(existingRenewal.corUrl || "");
    }
  }, [existingRenewal]);

  const uploadFile = useCallback(async (
    file: File,
    type: string,
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void
  ) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setUrl(data.url);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    type: string,
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void,
    acceptImages: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = acceptImages
      ? ["application/pdf", "image/jpeg", "image/png", "image/webp"]
      : ["application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      toast.error(acceptImages ? "Only PDF and image files are accepted" : "Only PDF files are accepted");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    uploadFile(file, type, setUploading, setUrl);
  }, [uploadFile]);

  const getAvailabilitySummary = useCallback(() => {
    const totalSlots = availability.filter(Boolean).length;
    const SLOTS_PER_DAY = 22;
    const DAYS_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const activeDays = DAYS_KEYS.filter((_, idx) =>
      availability.slice(idx * SLOTS_PER_DAY, (idx + 1) * SLOTS_PER_DAY).some(Boolean)
    );
    return { totalSlots, activeDays };
  }, [availability]);

  const validateStep = (step: number): boolean => {
    if (step === 2) {
      if (!intentLetterUrl) {
        toast.error("Intent letter is required");
        return false;
      }
      if (!reportOfGradeUrl) {
        toast.error("Report of grades is required");
        return false;
      }
      if (!corUrl) {
        toast.error("Certificate of Registration (COR) is required");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (requestTransfer) {
        if (!transferReason.trim()) {
          toast.error("Please provide a reason for the transfer");
          return false;
        }
        if (!newOfficeId) {
          toast.error("Please select a new office");
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (!confirmAccurate || !agreeTerms) {
      toast.error("Please confirm all checkboxes before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const totalSlots = availability.filter(Boolean).length;
      const body: Record<string, unknown> = {
        availabilityJson: totalSlots > 0 ? JSON.stringify(availability) : null,
        requestTransfer,
        transferReason: requestTransfer ? transferReason : null,
        newOfficeId: requestTransfer ? newOfficeId : null,
        intentLetterUrl,
        reportOfGradeUrl,
        corUrl,
      };

      const res = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit renewal");
      }

      toast.success(data.message || "Renewal submitted successfully!");
      setExistingRenewal(data.renewal);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit renewal");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading renewal page...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or not SA
  if (!session || user?.role !== "STUDENT_ASSISTANT") {
    return null;
  }

  // Renewal season not open and no existing renewal
  if (settings && !settings.renewalOpen && !existingRenewal) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/20">
              <CalendarCheck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Renewal Period Not Open
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The renewal period is not currently open. Please wait for the announcement from the SA Adviser or Super Admin.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>You will be notified when the renewal season opens.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Existing renewal with status other than REQUIRES_CHANGES
  if (existingRenewal && existingRenewal.status !== "REQUIRES_CHANGES") {
    const statusInfo = statusConfig[existingRenewal.status] || statusConfig.PENDING_REVIEW;
    const StatusIcon = statusInfo.icon;

    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-700 to-amber-500" />
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                <StatusIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {existingRenewal.status === "APPROVED" && "Your Renewal has been Approved! "}
                {existingRenewal.status === "REJECTED" && "Your Renewal has been Rejected"}
                {existingRenewal.status === "PENDING_REVIEW" && "Your Renewal is Pending Review"}
                {existingRenewal.status === "UNDER_REVIEW" && "Your Renewal is Being Reviewed"}
              </h2>
              <Badge className={cn("mt-2", statusInfo.color)} variant="secondary">
                {statusInfo.label}
              </Badge>

              <div className="mt-6 space-y-3 text-left max-w-md mx-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference ID</span>
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{existingRenewal.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Academic Year</span>
                  <span className="font-medium">{existingRenewal.academicYear || "—"} {existingRenewal.semester || ""}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">
                    {existingRenewal.submittedAt
                      ? new Date(existingRenewal.submittedAt).toLocaleDateString()
                      : new Date(existingRenewal.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {existingRenewal.requestTransfer && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transfer Request</span>
                    <Badge variant="outline" className="text-xs">Requested</Badge>
                  </div>
                )}
              </div>

              {existingRenewal.reviewNotes && (
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Review Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{existingRenewal.reviewNotes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If REQUIRES_CHANGES, allow editing
  const isEditing = existingRenewal?.status === "REQUIRES_CHANGES";
  const { totalSlots, activeDays } = getAvailabilitySummary();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? "Update Renewal" : "SA Renewal Application"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditing
              ? "Update your renewal based on the review feedback below."
              : `Renew your Student Assistant status for ${settings?.academicYear || "the new semester"}.`}
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          Step {currentStep} of {STEPS.length}
        </Badge>
      </div>

      {/* Review notes from REQUIRES_CHANGES */}
      {isEditing && existingRenewal?.reviewNotes && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-300">Changes Required</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            {existingRenewal.reviewNotes}
          </AlertDescription>
        </Alert>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <button
              key={step.id}
              onClick={() => step.id < currentStep && setCurrentStep(step.id)}
              disabled={step.id > currentStep}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-blue-700 text-white shadow-md"
                  : isCompleted
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <StepIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{step.id}</span>
              {isCompleted && <CheckCircle2 className="h-3 w-3 ml-1" />}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                {(() => { const I = STEPS[currentStep - 1].icon; return <I className="h-5 w-5 text-blue-600" />; })()}
                {STEPS[currentStep - 1].title}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Update your weekly availability for the new semester. (Optional)"}
                {currentStep === 2 && "Upload the required documents for your renewal."}
                {currentStep === 3 && "Let us know if you want to transfer to a different office."}
                {currentStep === 4 && "Review all your information before submitting."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Availability */}
              {currentStep === 1 && (
                <AvailabilityGrid value={availability} onChange={setAvailability} />
              )}

              {/* Step 2: Documents */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Intent Letter (Required) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Intent Letter <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload your signed intent letter to continue as a Student Assistant. PDF only, max 10MB.
                    </p>
                    {intentLetterUrl ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                        <FileIcon className="h-5 w-5 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">Intent letter uploaded</span>
                          <p className="text-xs text-muted-foreground truncate">{intentLetterUrl}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIntentLetterUrl("")}
                          className="h-7 text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileChange(e, "intentLetter", setUploadingIntent, setIntentLetterUrl)}
                          className="hidden"
                          id="intent-letter"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("intent-letter")?.click()}
                          disabled={uploadingIntent}
                          className="w-full"
                        >
                          {uploadingIntent ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {uploadingIntent ? "Uploading..." : "Upload Intent Letter (PDF)"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Report of Grades (Required) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Report of Grades <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload your latest report of grades. PDF or image, max 10MB.
                    </p>
                    {reportOfGradeUrl ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                        {reportOfGradeUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                          <ImageIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-green-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">Report of grades uploaded</span>
                          <p className="text-xs text-muted-foreground truncate">{reportOfGradeUrl}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReportOfGradeUrl("")}
                          className="h-7 text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={(e) => handleFileChange(e, "gradeReport", setUploadingGrade, setReportOfGradeUrl, true)}
                          className="hidden"
                          id="report-grade"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("report-grade")?.click()}
                          disabled={uploadingGrade}
                          className="w-full"
                        >
                          {uploadingGrade ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {uploadingGrade ? "Uploading..." : "Upload Report of Grades (PDF/Image)"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Certificate of Registration (Required) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Certificate of Registration (COR) <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload your certificate of registration for the new semester. PDF or image, max 10MB.
                    </p>
                    {corUrl ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                        {corUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                          <ImageIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-green-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">COR uploaded</span>
                          <p className="text-xs text-muted-foreground truncate">{corUrl}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCorUrl("")}
                          className="h-7 text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={(e) => handleFileChange(e, "registration", setUploadingCor, setCorUrl, true)}
                          className="hidden"
                          id="cert-reg"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("cert-reg")?.click()}
                          disabled={uploadingCor}
                          className="w-full"
                        >
                          {uploadingCor ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {uploadingCor ? "Uploading..." : "Upload Certificate of Registration (PDF/Image)"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Office Transfer */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Current office display */}
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Current Office</p>
                    <p className="text-sm font-semibold">
                      {existingRenewal?.user?.profile?.office?.name || "Not assigned"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Do you want to request an office transfer?</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        If you wish to be reassigned, select Yes and provide your reason.
                      </p>
                    </div>
                    <Switch checked={requestTransfer} onCheckedChange={setRequestTransfer} />
                  </div>

                  {requestTransfer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="transferReason">
                          Reason for Transfer <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="transferReason"
                          value={transferReason}
                          onChange={(e) => setTransferReason(e.target.value)}
                          placeholder="Explain why you want to transfer to a different office..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newOffice">
                          New Office <span className="text-red-500">*</span>
                        </Label>
                        <Select value={newOfficeId} onValueChange={setNewOfficeId}>
                          <SelectTrigger id="newOffice">
                            <SelectValue placeholder="Select your preferred new office" />
                          </SelectTrigger>
                          <SelectContent>
                            {offices
                              .filter((o) => o.id !== existingRenewal?.user?.profile?.office?.id)
                              .map((office) => (
                                <SelectItem key={office.id} value={office.id}>
                                  {office.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}

                  {!requestTransfer && (
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-green-700 dark:text-green-400">
                          I will remain at my current office for the next semester.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {/* Warning */}
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-300">Please double-check your information</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      Errors or incomplete information may result in rejection. Make sure all documents are valid and information is accurate.
                    </AlertDescription>
                  </Alert>

                  {/* Availability Summary */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Weekly Availability
                    </h4>
                    {totalSlots > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {totalSlots} time slot{totalSlots !== 1 ? "s" : ""} selected across {activeDays.length} day{activeDays.length !== 1 ? "s" : ""}
                        {" "}( {activeDays.join(", ")} )
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No availability provided (optional)</p>
                    )}
                  </div>

                  {/* Documents Summary */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Documents
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Intent Letter</span>
                        <Badge variant={intentLetterUrl ? "default" : "destructive"} className="text-xs">
                          {intentLetterUrl ? "Uploaded" : "Missing"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Report of Grades</span>
                        <Badge variant={reportOfGradeUrl ? "default" : "destructive"} className="text-xs">
                          {reportOfGradeUrl ? "Uploaded" : "Missing"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Certificate of Registration</span>
                        <Badge variant={corUrl ? "default" : "destructive"} className="text-xs">
                          {corUrl ? "Uploaded" : "Missing"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Summary */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Office Transfer
                    </h4>
                    {requestTransfer ? (
                      <div className="space-y-2">
                        <Badge variant="outline">Transfer Requested</Badge>
                        <div className="text-sm text-muted-foreground">
                          <p>From: <span className="font-medium text-foreground">{existingRenewal?.user?.profile?.office?.name || "Not assigned"}</span></p>
                          <p>To: <span className="font-medium text-foreground">{offices.find((o) => o.id === newOfficeId)?.name || "Unknown"}</span></p>
                        </div>
                        {transferReason && (
                          <p className="text-sm text-muted-foreground italic">&quot;{transferReason}&quot;</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-muted-foreground">Remaining at current office</p>
                      </div>
                    )}
                  </div>

                  {/* Academic Period */}
                  <div className="rounded-lg border p-4 space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-blue-600" />
                      Academic Period
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {settings?.academicYear || "—"} — {settings?.currentSemester || "—"}
                    </p>
                  </div>

                  {/* Confirmations */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirm-accurate"
                        checked={confirmAccurate}
                        onCheckedChange={(v) => setConfirmAccurate(v === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="confirm-accurate" className="text-sm font-normal cursor-pointer">
                        I confirm that all information provided is accurate and the documents uploaded are authentic.
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agree-terms"
                        checked={agreeTerms}
                        onCheckedChange={(v) => setAgreeTerms(v === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="agree-terms" className="text-sm font-normal cursor-pointer">
                        I agree to the renewal terms and conditions of the UMak Student Assistant Management System.
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                {currentStep < 4 ? (
                  <Button onClick={nextStep} className="bg-blue-700 hover:bg-blue-800">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !confirmAccurate || !agreeTerms || !intentLetterUrl || !reportOfGradeUrl || !corUrl}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {submitting ? "Submitting..." : isEditing ? "Update & Resubmit" : "Submit Renewal"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
