"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  CalendarDays,
  Building2,
  CheckCircle,
  RefreshCw,
  Clock,
  X,
  Info,
  ShieldCheck,
  GraduationCap,
  User,
} from "lucide-react";
import { PublicLayout } from "@/components/public/public-layout";
import { AvailabilityGrid } from "@/components/apply/availability-grid";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { DAYS, TIME_SLOTS, TOTAL_SLOTS } from "@/lib/validations/application";

// ============================================================
// TYPES
// ============================================================

interface RenewalFormData {
  statementOfIntent: string;
  confirmAccurate: boolean;
  availability: boolean[];
  reportOfGradesUrl: string;
  reportOfGradesName: string;
  corUrl: string;
  corName: string;
  requestTransfer: boolean;
  transferReason: string;
  preferredOfficeId: string;
}

interface SAProfile {
  firstName: string | null;
  lastName: string | null;
  email: string;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  studentNumber: string | null;
  officeId: string | null;
  officeName: string | null;
}

interface Office {
  id: string;
  name: string;
  code: string | null;
}

const TOTAL_STEPS = 5;

const RENEWAL_STEPS = [
  { id: 1, title: "Intent & Eligibility", shortTitle: "Intent", description: "Your profile and statement of intent", icon: "User" },
  { id: 2, title: "Weekly Availability", shortTitle: "Availability", description: "Your preferred work schedule", icon: "CalendarDays" },
  { id: 3, title: "Academic Performance", shortTitle: "Documents", description: "Upload grades and registration", icon: "FileText" },
  { id: 4, title: "Office Transfer", shortTitle: "Transfer", description: "Optional office transfer request", icon: "Building2" },
  { id: 5, title: "Review & Submit", shortTitle: "Submit", description: "Review and submit your renewal", icon: "CheckCircle" },
] as const;

const defaultFormData: RenewalFormData = {
  statementOfIntent: "",
  confirmAccurate: false,
  availability: Array(TOTAL_SLOTS).fill(false) as boolean[],
  reportOfGradesUrl: "",
  reportOfGradesName: "",
  corUrl: "",
  corName: "",
  requestTransfer: false,
  transferReason: "",
  preferredOfficeId: "",
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

// ============================================================
// HELPER: Convert availability boolean[] to JSON
// ============================================================
function availabilityToJson(availability: boolean[]): string {
  const SLOTS_PER_DAY = 22;
  const result: Record<string, string[]> = {};

  DAYS.forEach((day, dayIndex) => {
    const dayName = day.toLowerCase();
    const slots: string[] = [];
    for (let i = 0; i < SLOTS_PER_DAY; i++) {
      if (availability[dayIndex * SLOTS_PER_DAY + i]) {
        // Convert "7:00 AM" to "07:00", "1:00 PM" to "13:00"
        const timeStr = TIME_SLOTS[i];
        const [time, period] = timeStr.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        slots.push(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
      }
    }
    if (slots.length > 0) {
      result[dayName] = slots;
    }
  });

  return JSON.stringify(result);
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function RenewalPage() {
  const { data: session, status: authStatus } = useSession();
  const user = session?.user as { id: string; role: string } | undefined;

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState<RenewalFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submittedRef, setSubmittedRef] = useState("");

  // Data
  const [profile, setProfile] = useState<SAProfile | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [availabilityRequired, setAvailabilityRequired] = useState(false);
  const [existingRenewal, setExistingRenewal] = useState<{ id: string; status: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingRog, setUploadingRog] = useState(false);
  const [uploadingCor, setUploadingCor] = useState(false);

  // Fetch profile, offices, settings
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      try {
        const [settingsRes, profileRes, officesRes, availRes, renewalsRes] = await Promise.all([
          fetch("/api/system-settings"),
          fetch("/api/student-assistants/" + user.id),
          fetch("/api/offices?isActive=true&limit=100"),
          fetch(`/api/renewals/availability-required?userId=${user.id}`),
          fetch("/api/renewals"),
        ]);

        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setRenewalOpen(settings.renewalOpen === true);
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.user && data.profile) {
            setProfile({
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              email: data.user.email,
              college: data.profile.college,
              program: data.profile.program,
              yearLevel: data.profile.yearLevel,
              studentNumber: data.profile.studentNumber,
              officeId: data.profile.officeId,
              officeName: data.profile.office?.name || null,
            });
          }
        }

        if (officesRes.ok) {
          const data = await officesRes.json();
          setOffices(
            (data.offices || []).map((o: Office) => ({
              id: o.id,
              name: o.name,
              code: o.code,
            }))
          );
        }

        // Check availability required
        if (availRes.ok) {
          const data = await availRes.json();
          // availability-required is a PUT endpoint, so this may 404 or return the renewal
        }

        // Check if renewal already exists
        if (renewalsRes.ok) {
          const data = await renewalsRes.json();
          const myRenewals = data.renewals || [];
          if (myRenewals.length > 0 && !["REJECTED"].includes(myRenewals[0].status)) {
            setExistingRenewal({
              id: myRenewals[0].id,
              status: myRenewals[0].status,
            });
          }
        }

        // Try to get availabilityRequired from the renewal
        if (renewalsRes.ok) {
          const data = await renewalsRes.json();
          const myRenewals = data.renewals || [];
          if (myRenewals.length > 0 && myRenewals[0].availabilityRequired) {
            setAvailabilityRequired(true);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchData();
  }, [user?.id]);

  const updateField = useCallback(
    <K extends keyof RenewalFormData>(key: K, value: RenewalFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  // Upload file helper
  const uploadFile = useCallback(async (file: File, type: string): Promise<{ url: string; name: string } | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "document");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Upload failed");
    }

    const data = await res.json();
    return { url: data.url, name: file.name };
  }, []);

  // Validate current step
  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Record<string, string> = {};

      if (step === 1) {
        if (!formData.statementOfIntent.trim()) {
          newErrors.statementOfIntent = "Statement of intent is required";
        } else if (formData.statementOfIntent.trim().length < 20) {
          newErrors.statementOfIntent = "Please write at least 20 characters";
        }
        if (!formData.confirmAccurate) {
          newErrors.confirmAccurate = "You must confirm the information is accurate";
        }
      }

      if (step === 2) {
        if (availabilityRequired) {
          const selected = formData.availability.filter(Boolean).length;
          if (selected === 0) {
            newErrors.availability = "Weekly availability is required by your adviser. Please select at least one slot.";
          }
        }
      }

      if (step === 3) {
        if (!formData.reportOfGradesUrl) {
          newErrors.reportOfGradesUrl = "Report of Grades (PDF) is required";
        }
        if (!formData.corUrl) {
          newErrors.corUrl = "Certificate of Registration (PDF) is required";
        }
      }

      if (step === 4) {
        if (formData.requestTransfer && !formData.preferredOfficeId) {
          newErrors.preferredOfficeId = "Please select a preferred office";
        }
      }

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        toast.error("Please fix the errors before proceeding.");
        return false;
      }
      return true;
    },
    [formData, availabilityRequired]
  );

  const goToNext = useCallback(() => {
    if (!validateStep(currentStep)) return;

    if (currentStep < TOTAL_STEPS) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, validateStep]);

  const goToPrev = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const payload = {
        statementOfIntent: formData.statementOfIntent,
        availabilityJson: availabilityToJson(formData.availability),
        requestTransfer: formData.requestTransfer,
        transferReason: formData.requestTransfer ? formData.transferReason : null,
        newOfficeId: formData.requestTransfer ? formData.preferredOfficeId : null,
        reportOfGradeUrl: formData.reportOfGradesUrl,
        corUrl: formData.corUrl,
      };

      const res = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit renewal");
      }

      setSubmittedRef(data.renewal?.id || "");
      setShowSuccessDialog(true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, formData, validateStep]);

  // File upload handlers
  const handleRogUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingRog(true);
    try {
      const result = await uploadFile(file, "document");
      if (result) {
        updateField("reportOfGradesUrl", result.url);
        updateField("reportOfGradesName", result.name);
        toast.success("Report of Grades uploaded successfully");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingRog(false);
    }
    if (e.target) e.target.value = "";
  }, [uploadFile, updateField]);

  const handleCorUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingCor(true);
    try {
      const result = await uploadFile(file, "document");
      if (result) {
        updateField("corUrl", result.url);
        updateField("corName", result.name);
        toast.success("Certificate of Registration uploaded successfully");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingCor(false);
    }
    if (e.target) e.target.value = "";
  }, [uploadFile, updateField]);

  // Availability summary
  const availabilitySummary = useMemo(() => {
    const selected = formData.availability.filter(Boolean).length;
    if (selected === 0) return "No availability selected";
    const SLOTS_PER_DAY = 22;
    const daysWithSlots = DAYS.filter((_, dayIndex) => {
      let count = 0;
      for (let i = 0; i < SLOTS_PER_DAY; i++) {
        if (formData.availability[dayIndex * SLOTS_PER_DAY + i]) count++;
      }
      return count > 0;
    });
    return `${selected} slots across ${daysWithSlots.length} day${daysWithSlots.length !== 1 ? "s" : ""}`;
  }, [formData.availability]);

  // Get office name by id
  const getOfficeName = useCallback(
    (id: string) => offices.find((o) => o.id === id)?.name || "Unknown",
    [offices]
  );

  // ======================
  // LOADING / GATE STATES
  // ======================

  if (authStatus === "loading" || loadingProfile) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            <p className="text-sm text-muted-foreground">Loading renewal form...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Not authenticated or not an SA
  if (!user || user.role !== "STUDENT_ASSISTANT") {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="border-0 shadow-lg max-w-md w-full mx-4">
            <CardContent className="py-12 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/25 mb-4" />
              <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You need to be logged in as a Student Assistant to access the renewal form.
              </p>
              <Button asChild className="bg-blue-700 hover:bg-blue-800">
                <a href="/portal-login">Sign In</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // Renewal season closed
  if (!renewalOpen && !existingRenewal) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="border-0 shadow-lg max-w-md w-full mx-4">
            <CardContent className="py-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-amber-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Renewal Period is Not Currently Open</h2>
              <p className="text-sm text-muted-foreground">
                The renewal period for Student Assistants is not open at this time. Please check back later or contact your adviser for more information.
              </p>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // Existing renewal (not REJECTED)
  if (existingRenewal) {
    const statusLabels: Record<string, string> = {
      PENDING_REVIEW: "Pending Review",
      UNDER_REVIEW: "Under Review",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      REQUIRES_CHANGES: "Requires Changes",
    };
    const statusColors: Record<string, string> = {
      PENDING_REVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      UNDER_REVIEW: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
      APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      REQUIRES_CHANGES: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };

    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="border-0 shadow-lg max-w-md w-full mx-4">
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-blue-700" />
              <div>
                <h2 className="text-xl font-bold mb-2">Renewal Already Submitted</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  You have already submitted a renewal application.
                </p>
                <Badge className={cn("text-xs", statusColors[existingRenewal.status] || "")}>
                  {statusLabels[existingRenewal.status] || existingRenewal.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-3 font-mono">
                  Ref: {existingRenewal.id}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // ======================
  // MAIN WIZARD UI
  // ======================

  const fullName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
    : "Student Assistant";

  return (
    <PublicLayout>
      <div className="relative overflow-hidden mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 -left-20 h-[300px] w-[300px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -right-20 h-[350px] w-[350px] rounded-full bg-amber-500/[0.04] dark:bg-amber-500/[0.06] blur-3xl"
            animate={{ x: [0, -18, 22, 0], y: [0, 18, -12, 0], scale: [1, 0.94, 1.08, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            SA Renewal Application
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete all {TOTAL_STEPS} steps to submit your renewal for {profile?.yearLevel || "the next semester"}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 rounded-xl border bg-card p-4 shadow-lg border-0">
          <RenewalStepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} steps={RENEWAL_STEPS} />
        </div>

        {/* Step Content */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-amber-500">
                      <span className="text-lg font-bold">{currentStep}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{RENEWAL_STEPS[currentStep - 1]?.title}</CardTitle>
                      <CardDescription>{RENEWAL_STEPS[currentStep - 1]?.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentStep === 1 && (
                    <Step1Intent
                      profile={profile}
                      formData={formData}
                      updateField={updateField}
                      errors={errors}
                    />
                  )}
                  {currentStep === 2 && (
                    <Step2Availability
                      availability={formData.availability}
                      onChange={(val) => updateField("availability", val)}
                      availabilityRequired={availabilityRequired}
                      error={errors.availability}
                    />
                  )}
                  {currentStep === 3 && (
                    <Step3Documents
                      formData={formData}
                      updateField={updateField}
                      errors={errors}
                      uploadingRog={uploadingRog}
                      uploadingCor={uploadingCor}
                      handleRogUpload={handleRogUpload}
                      handleCorUpload={handleCorUpload}
                    />
                  )}
                  {currentStep === 4 && (
                    <Step4Transfer
                      formData={formData}
                      updateField={updateField}
                      errors={errors}
                      offices={offices}
                      currentOffice={profile?.officeName}
                    />
                  )}
                  {currentStep === 5 && (
                    <Step5Review
                      profile={profile}
                      formData={formData}
                      updateField={updateField}
                      errors={errors}
                      availabilitySummary={availabilitySummary}
                      getOfficeName={getOfficeName}
                      goToStep={(s) => {
                        setDirection(s > currentStep ? 1 : -1);
                        setCurrentStep(s);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrev}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < TOTAL_STEPS ? (
              <Button
                type="button"
                onClick={goToNext}
                className="gap-2 bg-blue-700 text-white hover:bg-blue-800 dark:bg-amber-500 dark:text-gray-900 dark:hover:bg-amber-600"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setShowSubmitConfirmDialog(true)}
                disabled={isSubmitting}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit Renewal
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Renewal Submitted!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your renewal application has been successfully submitted. You can track its
                  status using your reference number.
                </p>
              </div>
              <div className="w-full rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Reference Number</p>
                <p className="font-mono text-sm font-bold">{submittedRef}</p>
              </div>
              <div className="flex w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a href="/">Go to Home</a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Submit Confirmation Dialog */}
        <AlertDialog open={showSubmitConfirmDialog} onOpenChange={setShowSubmitConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Submission
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit your renewal application? You cannot make changes after
                submission. Please double-check all your information before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="mt-0 sm:mt-0">No, Go Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowSubmitConfirmDialog(false);
                  handleSubmit();
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Yes, Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PublicLayout>
  );
}

// ============================================================
// STEP INDICATOR (Renewal-specific)
// ============================================================

function RenewalStepIndicator({
  currentStep,
  totalSteps,
  steps,
}: {
  currentStep: number;
  totalSteps: number;
  steps: readonly { id: number; title: string; shortTitle: string; icon: string }[];
}) {
  return (
    <div className="w-full">
      {/* Desktop version */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                          ? "border-blue-700 bg-blue-700 text-white shadow-lg shadow-blue-700/30"
                          : "border-muted-foreground/30 bg-background text-muted-foreground"
                    )}
                  >
                    <span className="text-sm font-bold">
                      {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold whitespace-nowrap",
                      isCurrent
                        ? "text-blue-700 dark:text-amber-500"
                        : isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="mx-1 mt-[-18px] h-0.5 flex-1">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        currentStep > step.id
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile version */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : isCurrent
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-amber-500"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
                  {step.shortTitle}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-0.5 h-0.5 w-3 rounded-full",
                      isCompleted ? "bg-emerald-500" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-700 transition-all duration-500 dark:bg-amber-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Step {currentStep} of {totalSteps} — {steps[currentStep - 1]?.title}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// STEP 1: Intent & Eligibility
// ============================================================

function Step1Intent({
  profile,
  formData,
  updateField,
  errors,
}: {
  profile: SAProfile | null;
  formData: RenewalFormData;
  updateField: <K extends keyof RenewalFormData>(key: K, value: RenewalFormData[K]) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-blue-700" />
          Your Profile Information
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Full Name</p>
            <p className="text-sm font-medium">
              {profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Student Number</p>
            <p className="text-sm font-medium">{profile?.studentNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">College</p>
            <p className="text-sm font-medium">{profile?.college || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Program</p>
            <p className="text-sm font-medium">{profile?.program || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Year Level</p>
            <p className="text-sm font-medium">{profile?.yearLevel || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Assigned Office</p>
            <p className="text-sm font-medium">{profile?.officeName || "—"}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Statement of Intent */}
      <div className="space-y-1.5">
        <Label className={cn(errors.statementOfIntent && "text-destructive")}>
          Statement of Intent <span className="ml-0.5 text-red-500">*</span>
        </Label>
        <Textarea
          placeholder="Why do you want to continue as a Student Assistant? Share your motivation, goals, and how you've contributed..."
          value={formData.statementOfIntent}
          onChange={(e) => updateField("statementOfIntent", e.target.value)}
          rows={6}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          {errors.statementOfIntent && (
            <p className="text-xs text-destructive">{errors.statementOfIntent}</p>
          )}
          <p className={cn("text-xs text-muted-foreground ml-auto", errors.statementOfIntent && "invisible")}>
            {formData.statementOfIntent.trim().length} / 20 min characters
          </p>
        </div>
      </div>

      <Separator />

      {/* Confirmation */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="confirm-accurate"
          checked={formData.confirmAccurate}
          onCheckedChange={(checked) => updateField("confirmAccurate", checked === true)}
        />
        <div>
          <Label htmlFor="confirm-accurate" className={cn(errors.confirmAccurate && "text-destructive")}>
            I confirm all information above is accurate
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            By checking this box, you certify that the profile information displayed is correct.
          </p>
          {errors.confirmAccurate && (
            <p className="text-xs text-destructive mt-1">{errors.confirmAccurate}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2: Weekly Availability
// ============================================================

function Step2Availability({
  availability,
  onChange,
  availabilityRequired,
  error,
}: {
  availability: boolean[];
  onChange: (value: boolean[]) => void;
  availabilityRequired: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-4">
      {availabilityRequired && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-700 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Weekly availability is required by your adviser
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
              Please select your available time slots. This information helps assign your work schedule.
            </p>
          </div>
        </div>
      )}

      <AvailabilityGrid value={availability} onChange={onChange} />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================
// STEP 3: Academic Performance (Documents)
// ============================================================

function Step3Documents({
  formData,
  updateField,
  errors,
  uploadingRog,
  uploadingCor,
  handleRogUpload,
  handleCorUpload,
}: {
  formData: RenewalFormData;
  updateField: <K extends keyof RenewalFormData>(key: K, value: RenewalFormData[K]) => void;
  errors: Record<string, string>;
  uploadingRog: boolean;
  uploadingCor: boolean;
  handleRogUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCorUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Both documents below are <strong>required</strong>. Please upload PDF files only (max 5MB each).
        </p>
      </div>

      {/* Report of Grades */}
      <div className="space-y-2">
        <Label className={cn(errors.reportOfGradesUrl && "text-destructive")}>
          <GraduationCap className="h-3.5 w-3.5 inline mr-1" />
          Report of Grades <span className="ml-0.5 text-red-500">*</span>
        </Label>

        {formData.reportOfGradesUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{formData.reportOfGradesName || "Report of Grades"}</p>
              <p className="text-xs text-muted-foreground">Uploaded successfully</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-destructive"
              onClick={() => {
                updateField("reportOfGradesUrl", "");
                updateField("reportOfGradesName", "");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
              errors.reportOfGradesUrl
                ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20 hover:border-red-400"
                : "border-muted hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
            )}
            onClick={() => document.getElementById("rog-upload")?.click()}
          >
            {uploadingRog ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-700 mb-2" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm font-medium">
              {uploadingRog ? "Uploading..." : "Click to upload Report of Grades"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF only, max 5MB</p>
            <input
              id="rog-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleRogUpload}
              disabled={uploadingRog}
            />
          </div>
        )}
        {errors.reportOfGradesUrl && (
          <p className="text-xs text-destructive">{errors.reportOfGradesUrl}</p>
        )}
      </div>

      <Separator />

      {/* Certificate of Registration */}
      <div className="space-y-2">
        <Label className={cn(errors.corUrl && "text-destructive")}>
          <FileText className="h-3.5 w-3.5 inline mr-1" />
          Certificate of Registration (COR) <span className="ml-0.5 text-red-500">*</span>
        </Label>

        {formData.corUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{formData.corName || "Certificate of Registration"}</p>
              <p className="text-xs text-muted-foreground">Uploaded successfully</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-destructive"
              onClick={() => {
                updateField("corUrl", "");
                updateField("corName", "");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
              errors.corUrl
                ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20 hover:border-red-400"
                : "border-muted hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
            )}
            onClick={() => document.getElementById("cor-upload")?.click()}
          >
            {uploadingCor ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-700 mb-2" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm font-medium">
              {uploadingCor ? "Uploading..." : "Click to upload Certificate of Registration"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF only, max 5MB</p>
            <input
              id="cor-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleCorUpload}
              disabled={uploadingCor}
            />
          </div>
        )}
        {errors.corUrl && (
          <p className="text-xs text-destructive">{errors.corUrl}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: Office Transfer
// ============================================================

function Step4Transfer({
  formData,
  updateField,
  errors,
  offices,
  currentOffice,
}: {
  formData: RenewalFormData;
  updateField: <K extends keyof RenewalFormData>(key: K, value: RenewalFormData[K]) => void;
  errors: Record<string, string>;
  offices: Office[];
  currentOffice: string | null | undefined;
}) {
  return (
    <div className="space-y-6">
      {/* Current Office */}
      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Current Office</p>
        <p className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-700" />
          {currentOffice || "Not assigned"}
        </p>
      </div>

      {/* Transfer Question */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Do you want to request an office transfer?</Label>
        <div className="flex gap-3 mt-2">
          <Button
            type="button"
            variant={formData.requestTransfer ? "default" : "outline"}
            className={cn(
              "flex-1",
              formData.requestTransfer
                ? "bg-blue-700 hover:bg-blue-800 text-white"
                : ""
            )}
            onClick={() => updateField("requestTransfer", true)}
          >
            Yes, I want to transfer
          </Button>
          <Button
            type="button"
            variant={!formData.requestTransfer ? "default" : "outline"}
            className={cn(
              "flex-1",
              !formData.requestTransfer
                ? "bg-blue-700 hover:bg-blue-800 text-white"
                : ""
            )}
            onClick={() => {
              updateField("requestTransfer", false);
              updateField("preferredOfficeId", "");
              updateField("transferReason", "");
            }}
          >
            No, keep current office
          </Button>
        </div>
      </div>

      {formData.requestTransfer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <Separator />

          {/* Office Selection */}
          <div className="space-y-1.5">
            <Label className={cn(errors.preferredOfficeId && "text-destructive")}>
              Preferred New Office <span className="ml-0.5 text-red-500">*</span>
            </Label>
            <Select
              value={formData.preferredOfficeId}
              onValueChange={(val) => updateField("preferredOfficeId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an office" />
              </SelectTrigger>
              <SelectContent>
                {offices
                  .filter((o) => o.name !== currentOffice)
                  .map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.preferredOfficeId && (
              <p className="text-xs text-destructive">{errors.preferredOfficeId}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason for Transfer Request</Label>
            <Textarea
              placeholder="Optional: Explain why you're requesting an office transfer..."
              value={formData.transferReason}
              onChange={(e) => updateField("transferReason", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// STEP 5: Review & Submit
// ============================================================

function Step5Review({
  profile,
  formData,
  updateField,
  errors,
  availabilitySummary,
  getOfficeName,
  goToStep,
}: {
  profile: SAProfile | null;
  formData: RenewalFormData;
  updateField: <K extends keyof RenewalFormData>(key: K, value: RenewalFormData[K]) => void;
  errors: Record<string, string>;
  availabilitySummary: string;
  getOfficeName: (id: string) => string;
  goToStep: (step: number) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Profile Summary */}
      <div className="rounded-lg border p-4">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => goToStep(1)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Profile Information</p>
              <p className="text-sm font-semibold mt-1">
                {profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.college} • {profile?.program} • {profile?.yearLevel}
              </p>
              <p className="text-xs text-muted-foreground">
                Office: {profile?.officeName || "Not assigned"}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">Edit</Badge>
          </div>
        </button>
      </div>

      {/* Statement of Intent */}
      <div className="rounded-lg border p-4">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => goToStep(1)}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Statement of Intent</p>
            <Badge variant="outline" className="text-xs">Edit</Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {formData.statementOfIntent || "Not provided"}
          </p>
        </button>
      </div>

      {/* Availability */}
      <div className="rounded-lg border p-4">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => goToStep(2)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Weekly Availability</p>
            <Badge variant="outline" className="text-xs">Edit</Badge>
          </div>
          <p className="text-sm">
            {availabilitySummary}
          </p>
        </button>
      </div>

      {/* Documents */}
      <div className="rounded-lg border p-4">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => goToStep(3)}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Academic Documents</p>
            <Badge variant="outline" className="text-xs">Edit</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={formData.reportOfGradesUrl ? "default" : "destructive"}
                className="text-[10px] w-20 justify-center"
              >
                {formData.reportOfGradesUrl ? "Uploaded" : "Missing"}
              </Badge>
              <span className="text-sm">Report of Grades</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={formData.corUrl ? "default" : "destructive"}
                className="text-[10px] w-20 justify-center"
              >
                {formData.corUrl ? "Uploaded" : "Missing"}
              </Badge>
              <span className="text-sm">Certificate of Registration</span>
            </div>
          </div>
        </button>
      </div>

      {/* Office Transfer */}
      <div className="rounded-lg border p-4">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => goToStep(4)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Office Transfer</p>
            <Badge variant="outline" className="text-xs">Edit</Badge>
          </div>
          <p className="text-sm">
            {formData.requestTransfer
              ? `Yes — Requesting transfer to ${getOfficeName(formData.preferredOfficeId)}`
              : "No — Keeping current office"}
          </p>
          {formData.requestTransfer && formData.transferReason && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              &quot;{formData.transferReason}&quot;
            </p>
          )}
        </button>
      </div>

      <Separator />

      {/* Final Confirmation */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="final-confirm"
          checked={formData.confirmAccurate}
          onCheckedChange={(checked) => updateField("confirmAccurate", checked === true)}
        />
        <div>
          <Label htmlFor="final-confirm" className={cn(errors.confirmAccurate && "text-destructive")}>
            I confirm all information is accurate and I want to submit my renewal
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            By checking this box, you confirm that all details provided are true and complete.
          </p>
          {errors.confirmAccurate && (
            <p className="text-xs text-destructive mt-1">{errors.confirmAccurate}</p>
          )}
        </div>
      </div>
    </div>
  );
}
