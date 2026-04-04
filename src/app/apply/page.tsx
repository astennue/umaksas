"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Check,
  CalendarDays,
  ShieldAlert,
  X,
  LogIn,
} from "lucide-react";
import { PublicLayout } from "@/components/public/public-layout";
import { StepIndicator } from "@/components/apply/step-indicator";
import { FileUpload } from "@/components/apply/file-upload";
import { ImageCropDialog } from "@/components/apply/image-crop-dialog";
import { ReviewSection } from "@/components/apply/review-section";
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
import {
  ApplicationFormData,
  defaultFormValues,
  stepSchemaMap,
  STEPS,
  COLLEGES,
  PROGRAMS_BY_COLLEGE,
  TOTAL_SLOTS,
  SLOTS_PER_DAY,
  DAYS,
  availabilityToJson,
  jsonToAvailability,
} from "@/lib/validations/application";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "umak-sas-draft";
const AUTO_SAVE_INTERVAL = 30000;
const TOTAL_STEPS = 12;

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

export default function ApplyPage() {
  const { data: session, status: authStatus } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<ApplicationFormData>(defaultFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState(false);
  const [submittedRef, setSubmittedRef] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSavedForm, setLastSavedForm] = useState<string>("");
  const [showRestoreDraftDialog, setShowRestoreDraftDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<any>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if user has started / has unsaved changes
  const hasStarted = useMemo(() => {
    return !!(
      formData.firstName ||
      formData.lastName ||
      formData.phone ||
      formData.email ||
      formData.college ||
      formData.studentNumber
    );
  }, [formData]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(formData) !== lastSavedForm;
  }, [formData, lastSavedForm]);

  // beforeunload handler — tab close / navigate away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStarted && !showSuccessDialog) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasStarted, showSuccessDialog]);

  // Browser back button handler
  useEffect(() => {
    if (showSuccessDialog) return;
    const handlePopState = () => {
      if (hasStarted && !showSuccessDialog) {
        window.history.pushState(null, "", window.location.href);
        setShowLeaveDialog(true);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasStarted, showSuccessDialog]);

  // Handle leave dialog confirm
  const handleLeaveConfirm = useCallback(() => {
    saveDraftImmediate();
    setShowLeaveDialog(false);
    window.history.back();
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.formData) {
          setPendingDraft(parsed);
          setShowRestoreDraftDialog(true);
        }
      }
    } catch (e) {
      console.error("Error loading draft:", e);
    }
    setIsLoadingDraft(false);
  }, []);

  // Restore draft from dialog
  const handleRestoreDraft = useCallback(() => {
    if (pendingDraft) {
      if (pendingDraft.formData) {
        const loaded = { ...defaultFormValues, ...pendingDraft.formData };
        setFormData(loaded);
        setLastSavedForm(JSON.stringify(loaded));
      }
      if (pendingDraft.currentStep) setCurrentStep(pendingDraft.currentStep);
      if (pendingDraft.completedSteps) setCompletedSteps(pendingDraft.completedSteps);
      if (pendingDraft.applicationId) setApplicationId(pendingDraft.applicationId);
    }
    setShowRestoreDraftDialog(false);
    setPendingDraft(null);
    toast.success("Draft restored! Continuing where you left off.");
  }, [pendingDraft]);

  // Start fresh from dialog
  const handleStartFresh = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setShowRestoreDraftDialog(false);
    setPendingDraft(null);
  }, []);

  // Save draft to localStorage (immediate)
  const saveDraftImmediate = useCallback(() => {
    try {
      const data = {
        formData,
        currentStep,
        completedSteps,
        applicationId,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      setLastSavedForm(JSON.stringify(formData));
    } catch (e) {
      console.error("Error saving draft:", e);
    }
  }, [formData, currentStep, completedSteps, applicationId]);

  // Save draft to localStorage (with isSaving guard)
  const saveDraft = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const data = {
        formData,
        currentStep,
        completedSteps,
        applicationId,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      setLastSavedForm(JSON.stringify(formData));
    } catch (e) {
      console.error("Error saving draft:", e);
    }
    setIsSaving(false);
  }, [formData, currentStep, completedSteps, applicationId, isSaving]);

  // Manual "Save as Draft" button handler with toast
  const handleSaveDraft = useCallback(async () => {
    await saveDraft();
    toast.success("Draft saved!");
  }, [saveDraft]);

  // Auto-save on step change
  useEffect(() => {
    if (!isLoadingDraft) {
      saveDraft();
    }
  }, [currentStep, saveDraft, isLoadingDraft]);

  // Auto-save timer — every 30 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(saveDraft, AUTO_SAVE_INTERVAL);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [saveDraft]);

  // Auto-save on field change (debounced)
  useEffect(() => {
    if (isLoadingDraft) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (hasStarted && JSON.stringify(formData) !== lastSavedForm) {
        saveDraftImmediate();
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData, isLoadingDraft, hasStarted, lastSavedForm, saveDraftImmediate]);

  // Clear draft handler
  const handleClearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setFormData(defaultFormValues);
    setCurrentStep(1);
    setCompletedSteps([]);
    setApplicationId(null);
    setErrors({});
    setLastSavedForm("");
    toast.success("Draft cleared.");
  }, []);

  // Update form field
  const updateField = useCallback(
    <K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  // Validate current step
  const validateStep = useCallback(
    (step: number): boolean => {
      const schema = stepSchemaMap[step - 1];
      if (!schema) return true;

      const result = schema.safeParse(formData);
      if (!result.success) {
        const newErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = String(issue.path[0]);
          if (!newErrors[key]) {
            newErrors[key] = issue.message;
          }
        }
        setErrors(newErrors);
        return false;
      }
      setErrors({});
      return true;
    },
    [formData]
  );

  // Go to next step
  const goToNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toast.error("Please fix the errors before proceeding.");
      return;
    }

    const newCompleted = completedSteps.includes(currentStep)
      ? completedSteps
      : [...completedSteps, currentStep];

    if (currentStep < TOTAL_STEPS) {
      setDirection(1);
      setCompletedSteps(newCompleted);
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, completedSteps, validateStep]);

  // Go to previous step
  const goToPrev = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Jump to specific step
  const goToStep = useCallback(
    (step: number) => {
      if (step < currentStep || completedSteps.includes(step) || step === currentStep + 1) {
        if (step > currentStep) {
          if (!validateStep(currentStep)) {
            toast.error("Please fix the errors before proceeding.");
            return;
          }
        }
        setDirection(step > currentStep ? 1 : -1);
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [currentStep, completedSteps, validateStep]
  );

  // Submit application
  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        currentStep: TOTAL_STEPS,
        employment: formData.employment,
        trainings: formData.trainings,
        references: formData.references,
        availability: formData.availability,
        weeklyAvailability: formData.weeklyAvailability,
      };

      let response: Response;
      let data: any;

      if (applicationId) {
        response = await fetch("/api/applications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: applicationId, ...payload }),
        });
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update application");
        }
      } else {
        response = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create application");
        }
        setApplicationId(data.id);
      }

      // Submit the application
      const submitResponse = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: data.id }),
      });
      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(submitData.error || "Failed to submit application");
      }

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      setSubmittedRef(submitData.id || data.id);
      setShowSuccessDialog(true);
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, formData, applicationId, validateStep]);

  // Handle photo crop
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropImageSrc(ev.target?.result as string);
        setCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = (croppedImage: string) => {
    updateField("photo", croppedImage);
  };

  // Start over
  const handleStartOver = () => {
    localStorage.removeItem(DRAFT_KEY);
    setFormData(defaultFormValues);
    setCurrentStep(1);
    setCompletedSteps([]);
    setApplicationId(null);
    setErrors({});
    setShowSuccessDialog(false);
    setShowSubmitConfirmDialog(false);
    setSubmittedRef("");
    setLastSavedForm("");
  };

  // Auth gate: require login before filling application
  if (authStatus === "loading") {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            <p className="text-sm text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!session) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-6 text-center max-w-md px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <LogIn className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Login Required</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You need to sign in with your UMak account to submit a Student Assistant application. Please log in first to continue.
              </p>
            </div>
            <a
              href="/portal-login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Apply
            </a>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isLoadingDraft) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            <p className="text-sm text-muted-foreground">Loading application...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="relative overflow-hidden mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 -left-20 h-[300px] w-[300px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -right-20 h-[350px] w-[350px] rounded-full bg-yellow-500/[0.04] dark:bg-yellow-500/[0.06] blur-3xl"
            animate={{ x: [0, -18, 22, 0], y: [0, 18, -12, 0], scale: [1, 0.94, 1.08, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[40%] left-[50%] h-[250px] w-[250px] rounded-full bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] blur-3xl"
            animate={{ x: [0, 15, -20, 0], y: [0, -15, 20, 0], scale: [1, 1.08, 0.92, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Student Assistant Application
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete all {TOTAL_STEPS} steps to submit your application
          </p>
          {completedSteps.length > 0 && (
            <Badge
              variant="secondary"
              className="mt-2 gap-1 bg-blue-100 text-blue-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            >
              <Save className="h-3 w-3" />
              Auto-saved • {completedSteps.length}/{TOTAL_STEPS} completed
            </Badge>
          )}
        </div>

        {/* Step Indicator */}
        <div className="mb-8 rounded-xl border bg-card p-4 shadow-lg border-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <StepIndicator
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={goToStep}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearDraft}
              className="ml-2 shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              title="Clear saved draft"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          </div>
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
              <Card className="glow-border border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <span className="text-lg font-bold">{currentStep}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{STEPS[currentStep - 1]?.title}</CardTitle>
                      <CardDescription>{STEPS[currentStep - 1]?.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentStep === 1 && <Step1Personal formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 2 && <Step2Contact formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 3 && <Step3Family formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 4 && <Step4Education formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 5 && <Step5Current formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 6 && <Step6Availability formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 7 && <Step7Employment formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 8 && <Step8Trainings formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 9 && <Step9References formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 10 && <Step10Documents formData={formData} updateField={updateField} errors={errors} handlePhotoSelect={handlePhotoSelect} />}
                  {currentStep === 11 && <Step11Essays formData={formData} updateField={updateField} errors={errors} />}
                  {currentStep === 12 && <Step12Review formData={formData} updateField={updateField} errors={errors} goToStep={goToStep} onSubmitClick={() => setShowSubmitConfirmDialog(true)} />}
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
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Save className="h-3 w-3" />
                Saving...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Save as Draft button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button
                type="button"
                onClick={goToNext}
                className="gap-2 bg-blue-700 text-white hover:bg-blue-800 dark:bg-yellow-500 dark:text-gray-900 dark:hover:bg-yellow-600"
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
                    Submit Application
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Discard Draft */}
        {completedSteps.length > 0 && !showSuccessDialog && (
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDiscardDialog(true)}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard & Start Over
            </Button>
          </div>
        )}
      </div>

      {/* Restore Draft Dialog */}
      <AlertDialog open={showRestoreDraftDialog} onOpenChange={setShowRestoreDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-blue-600" />
              Resume Previous Application?
            </AlertDialogTitle>
            <AlertDialogDescription>
              We found a saved draft of your application. Would you like to continue where you left off?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleStartFresh}>
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreDraft}
              className="bg-blue-700 text-white hover:bg-blue-800"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Page Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Leave Application?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave? Your progress will be saved automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveConfirm}
              className="bg-blue-700 text-white hover:bg-blue-800"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Application Submitted!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your application has been successfully submitted. You can track your
                application status using your reference number.
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
                onClick={handleStartOver}
              >
                Start New Application
              </Button>
              <Button
                type="button"
                asChild
                className="flex-1 bg-blue-700 text-white hover:bg-blue-800 dark:bg-yellow-500 dark:text-gray-900"
              >
                <a href={submittedRef ? `/track?ref=${submittedRef}` : "/"}>Track Application</a>
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
              Are you sure you want to submit your application? You cannot make changes after submission.
              Please double-check all your information before proceeding.
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

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Discard Application?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? All your progress will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Keep Draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartOver}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={cropImageSrc}
        onCrop={handleCropComplete}
        title="Crop 2x2 ID Photo"
      />
    </PublicLayout>
  );
}

// =====================================================
// STEP COMPONENTS
// =====================================================

interface StepProps {
  formData: ApplicationFormData;
  updateField: <K extends keyof ApplicationFormData>(
    key: K,
    value: ApplicationFormData[K]
  ) => void;
  errors: Record<string, string>;
}

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Step 1: Personal Information
function Step1Personal({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First Name" error={errors.firstName} required>
          <Input
            placeholder="Juan"
            value={formData.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
          />
        </FormField>
        <FormField label="Middle Name" error={errors.middleName}>
          <Input
            placeholder="Santos"
            value={formData.middleName}
            onChange={(e) => updateField("middleName", e.target.value)}
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Last Name" error={errors.lastName} required>
          <Input
            placeholder="Dela Cruz"
            value={formData.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
          />
        </FormField>
        <FormField label="Suffix" error={errors.suffix}>
          <Select value={formData.suffix || "None"} onValueChange={(v) => updateField("suffix", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select suffix" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Jr.">Jr.</SelectItem>
              <SelectItem value="Sr.">Sr.</SelectItem>
              <SelectItem value="III">III</SelectItem>
              <SelectItem value="IV">IV</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Date of Birth" error={errors.dateOfBirth} required>
          <Input
            type="date"
            value={formData.dateOfBirth}
            max={new Date(new Date().getFullYear() - 16, new Date().getMonth(), new Date().getDate()).toISOString().split("T")[0]}
            onChange={(e) => updateField("dateOfBirth", e.target.value)}
          />
        </FormField>
        <FormField label="Place of Birth" error={errors.placeOfBirth} required>
          <Input
            placeholder="City, Province"
            value={formData.placeOfBirth}
            onChange={(e) => updateField("placeOfBirth", e.target.value)}
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Sex" error={errors.gender} required>
          <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Civil Status" error={errors.civilStatus} required>
          <Select value={formData.civilStatus} onValueChange={(v) => updateField("civilStatus", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select civil status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Single">Single</SelectItem>
              <SelectItem value="Married">Married</SelectItem>
              <SelectItem value="Widowed">Widowed</SelectItem>
              <SelectItem value="Separated">Separated</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Religion" error={errors.religion}>
          <Input
            placeholder="e.g., Roman Catholic"
            value={formData.religion}
            onChange={(e) => updateField("religion", e.target.value)}
          />
        </FormField>
        <FormField label="Citizenship" error={errors.citizenship} required>
          <Input
            placeholder="e.g., Filipino"
            value={formData.citizenship}
            onChange={(e) => updateField("citizenship", e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
}

// Step 2: Contact Information
function Step2Contact({ formData, updateField, errors }: StepProps) {
  const handlePhoneInput = (field: "phone" | "alternatePhone", value: string) => {
    // Allow digits, +, -, (, ), spaces
    const filtered = value.replace(/[^0-9+\-() ]/g, "");
    updateField(field, filtered);
  };

  const handleZipInput = (value: string) => {
    const filtered = value.replace(/[^0-9]/g, "").slice(0, 4);
    updateField("residenceZip", filtered);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone Number" error={errors.phone} required>
          <Input
            placeholder="09123456789"
            value={formData.phone}
            onChange={(e) => handlePhoneInput("phone", e.target.value)}
            maxLength={20}
          />
        </FormField>
        <FormField label="Alternate Phone" error={errors.alternatePhone}>
          <Input
            placeholder="Optional"
            value={formData.alternatePhone}
            onChange={(e) => handlePhoneInput("alternatePhone", e.target.value)}
            maxLength={20}
          />
        </FormField>
      </div>
      <Separator />
      <div>
        <h4 className="mb-3 text-sm font-semibold">Residence Address</h4>
        <div className="space-y-4">
          <FormField label="Address" error={errors.residenceAddress} required>
            <Textarea
              placeholder="Street, Barangay, Subdivision..."
              value={formData.residenceAddress}
              onChange={(e) => updateField("residenceAddress", e.target.value)}
              rows={3}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="City/Municipality" error={errors.residenceCity} required>
              <Input
                placeholder="e.g., Makati City"
                value={formData.residenceCity}
                onChange={(e) => updateField("residenceCity", e.target.value)}
              />
            </FormField>
            <FormField label="Zip Code" error={errors.residenceZip}>
              <Input
                placeholder="e.g., 1210"
                value={formData.residenceZip}
                onChange={(e) => handleZipInput(e.target.value)}
                maxLength={4}
              />
              <p className="text-xs text-muted-foreground">4 digits only</p>
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Family Background
function Step3Family({ formData, updateField, errors }: StepProps) {
  const handlePhoneInput = (field: "fatherContact" | "motherContact" | "guardianContact", value: string) => {
    const filtered = value.replace(/[^0-9+\-() ]/g, "");
    updateField(field, filtered);
  };

  return (
    <div className="space-y-6">
      {/* Father */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <div className="h-2 w-2 rounded-full bg-blue-700" />
          Father&apos;s Information
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" error={errors.fatherName}>
            <Input
              placeholder="Father's full name"
              value={formData.fatherName}
              onChange={(e) => updateField("fatherName", e.target.value)}
            />
          </FormField>
          <FormField label="Occupation" error={errors.fatherOccupation}>
            <Input
              placeholder="e.g., Engineer"
              value={formData.fatherOccupation}
              onChange={(e) => updateField("fatherOccupation", e.target.value)}
            />
          </FormField>
          <FormField label="Contact Number" error={errors.fatherContact}>
            <Input
              placeholder="09123456789"
              value={formData.fatherContact}
              onChange={(e) => handlePhoneInput("fatherContact", e.target.value)}
              maxLength={20}
            />
          </FormField>
        </div>
      </div>

      <Separator />

      {/* Mother */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <div className="h-2 w-2 rounded-full bg-rose-500" />
          Mother&apos;s Information
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" error={errors.motherName}>
            <Input
              placeholder="Mother's full name"
              value={formData.motherName}
              onChange={(e) => updateField("motherName", e.target.value)}
            />
          </FormField>
          <FormField label="Maiden Name" error={errors.motherMaidenName}>
            <Input
              placeholder="Mother's maiden name"
              value={formData.motherMaidenName}
              onChange={(e) => updateField("motherMaidenName", e.target.value)}
            />
          </FormField>
          <FormField label="Occupation" error={errors.motherOccupation}>
            <Input
              placeholder="e.g., Teacher"
              value={formData.motherOccupation}
              onChange={(e) => updateField("motherOccupation", e.target.value)}
            />
          </FormField>
          <FormField label="Contact Number" error={errors.motherContact}>
            <Input
              placeholder="09123456789"
              value={formData.motherContact}
              onChange={(e) => handlePhoneInput("motherContact", e.target.value)}
              maxLength={20}
            />
          </FormField>
        </div>
      </div>

      <Separator />

      {/* Guardian */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          Guardian Information
          <span className="text-xs font-normal text-muted-foreground">(if applicable)</span>
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" error={errors.guardianName}>
            <Input
              placeholder="Guardian's full name"
              value={formData.guardianName}
              onChange={(e) => updateField("guardianName", e.target.value)}
            />
          </FormField>
          <FormField label="Relationship" error={errors.guardianRelation}>
            <Input
              placeholder="e.g., Aunt, Uncle, Grandparent"
              value={formData.guardianRelation}
              onChange={(e) => updateField("guardianRelation", e.target.value)}
            />
          </FormField>
          <FormField label="Contact Number" error={errors.guardianContact}>
            <Input
              placeholder="09123456789"
              value={formData.guardianContact}
              onChange={(e) => handlePhoneInput("guardianContact", e.target.value)}
              maxLength={20}
            />
          </FormField>
          <FormField label="No. of Siblings" error={errors.siblingsCount}>
            <Input
              type="number"
              placeholder="0"
              value={formData.siblingsCount}
              onChange={(e) => updateField("siblingsCount", e.target.value)}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// Step 4: Educational Background
function Step4Education({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          Elementary
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="School Name" error={errors.elementarySchool} required>
            <Input
              placeholder="Elementary school name"
              value={formData.elementarySchool}
              onChange={(e) => updateField("elementarySchool", e.target.value)}
            />
          </FormField>
          <FormField label="Year Graduated" error={errors.elementaryYear} required>
            <Input
              placeholder="e.g., 2018"
              value={formData.elementaryYear}
              onChange={(e) => updateField("elementaryYear", e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          High School
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="School Name" error={errors.highSchool} required>
            <Input
              placeholder="High school name"
              value={formData.highSchool}
              onChange={(e) => updateField("highSchool", e.target.value)}
            />
          </FormField>
          <FormField label="Year Graduated" error={errors.highSchoolYear} required>
            <Input
              placeholder="e.g., 2022"
              value={formData.highSchoolYear}
              onChange={(e) => updateField("highSchoolYear", e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          Senior High School
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="School Name" error={errors.seniorHigh} required>
            <Input
              placeholder="Senior high school name"
              value={formData.seniorHigh}
              onChange={(e) => updateField("seniorHigh", e.target.value)}
            />
          </FormField>
          <FormField label="Year Graduated" error={errors.seniorHighYear} required>
            <Input
              placeholder="e.g., 2024"
              value={formData.seniorHighYear}
              onChange={(e) => updateField("seniorHighYear", e.target.value)}
            />
          </FormField>
          <FormField label="Strand/Track" error={errors.seniorHighTrack}>
            <Input
              placeholder="e.g., STEM, ABM, GAS, HUMSS"
              value={formData.seniorHighTrack}
              onChange={(e) => updateField("seniorHighTrack", e.target.value)}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// Step 5: Current Education
function Step5Current({ formData, updateField, errors }: StepProps) {
  const [isOthersMode, setIsOthersMode] = useState(false);

  const programs = useMemo(() => {
    if (formData.college && PROGRAMS_BY_COLLEGE[formData.college]) {
      return PROGRAMS_BY_COLLEGE[formData.college];
    }
    return [];
  }, [formData.college]);

  const isOthersProgram = isOthersMode;

  const handleCollegeChange = (college: string) => {
    updateField("college", college);
    // Reset program when college changes
    updateField("program", "");
    setIsOthersMode(false);
  };

  const handleProgramChange = (program: string) => {
    if (program === "__others__") {
      // Don't set program to __others__, just clear it so the user can type
      updateField("program", "");
      setIsOthersMode(true);
    } else {
      updateField("program", program);
      setIsOthersMode(false);
    }
  };

  const handleGwaInput = (value: string) => {
    // Allow digits and up to one decimal point
    const filtered = value.replace(/[^0-9.]/g, "");
    // Only allow one decimal point
    const parts = filtered.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    updateField("gwa", filtered);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Student Number" error={errors.studentNumber} required>
          <Input
            placeholder="e.g., 2024-00001 or ABC-12345"
            value={formData.studentNumber}
            onChange={(e) => updateField("studentNumber", e.target.value.replace(/[^a-zA-Z0-9\-]/g, ""))}
            maxLength={15}
          />
        </FormField>
        <FormField label="College" error={errors.college} required>
          <Select value={formData.college} onValueChange={handleCollegeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select college" />
            </SelectTrigger>
            <SelectContent>
              {COLLEGES.map((college) => (
                <SelectItem key={college} value={college}>
                  {college}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Program / Course" error={errors.program} required>
          <Select
            value={isOthersProgram ? "__others__" : formData.program}
            onValueChange={handleProgramChange}
            disabled={!formData.college}
          >
            <SelectTrigger>
              <SelectValue placeholder={formData.college ? "Select program" : "Select college first"} />
            </SelectTrigger>
            <SelectContent>
              {programs.map((prog) => (
                <SelectItem key={prog} value={prog}>
                  {prog}
                </SelectItem>
              ))}
              {programs.length > 0 && (
                <SelectItem value="__others__">Others (please specify)</SelectItem>
              )}
            </SelectContent>
          </Select>
          {isOthersProgram && (
            <Input
              placeholder="Enter your program name"
              className="mt-2"
              value={formData.program}
              onChange={(e) => updateField("program", e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Year Level" error={errors.yearLevel} required>
          <Select value={formData.yearLevel || ""} onValueChange={(v) => updateField("yearLevel", v as ApplicationFormData["yearLevel"])}>
            <SelectTrigger>
              <SelectValue placeholder="Select year level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Year">1st Year</SelectItem>
              <SelectItem value="2nd Year">2nd Year</SelectItem>
              <SelectItem value="3rd Year">3rd Year</SelectItem>
              <SelectItem value="4th Year">4th Year</SelectItem>
              <SelectItem value="5th Year">5th Year</SelectItem>
              <SelectItem value="Irregular">Irregular</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Section" error={errors.section}>
          <Input
            placeholder="e.g., CS-301"
            value={formData.section}
            onChange={(e) => updateField("section", e.target.value)}
          />
        </FormField>
        <FormField label="GWA (General Weighted Average)" error={errors.gwa} required>
          <Input
            placeholder="e.g., 1.50"
            value={formData.gwa}
            onChange={(e) => handleGwaInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter a value between 1.00 (highest) and 5.00 (lowest), max 2 decimal places
          </p>
        </FormField>
      </div>
    </div>
  );
}

// Step 6: Weekly Availability
function Step6Availability({ formData, updateField }: StepProps) {
  // Convert from JSON string to boolean array for the grid
  const gridAvailability = useMemo(() => {
    if (formData.weeklyAvailability) {
      return jsonToAvailability(formData.weeklyAvailability);
    }
    if (formData.availability && formData.availability.length === TOTAL_SLOTS) {
      return formData.availability;
    }
    return Array(TOTAL_SLOTS).fill(false) as boolean[];
  }, [formData.weeklyAvailability, formData.availability]);

  const handleGridChange = useCallback(
    (newAvailability: boolean[]) => {
      // Update both the boolean array and the JSON string
      updateField("availability", newAvailability);
      updateField("weeklyAvailability", availabilityToJson(newAvailability));
    },
    [updateField]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Plot your weekly availability (Mon-Fri, 7:00 AM to 6:00 PM). Consider your class schedule.
        </p>
      </div>

      <AvailabilityGrid
        value={gridAvailability}
        onChange={handleGridChange}
      />
    </div>
  );
}

// Step 7: Skills & Employment
function Step7Employment({ formData, updateField, errors }: StepProps) {
  const employment = formData.employment || [];

  const addEmployment = () => {
    updateField("employment", [
      ...employment,
      { company: "", position: "", duration: "", description: "" },
    ]);
  };

  const removeEmployment = (index: number) => {
    updateField(
      "employment",
      employment.filter((_, i) => i !== index)
    );
  };

  const updateEmployment = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...employment];
    updated[index] = { ...updated[index], [field]: value };
    updateField("employment", updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <FormField label="Skills" error={errors.skills}>
          <Textarea
            placeholder="List your relevant skills (e.g., Microsoft Office, Communication, Leadership, Data Entry, Graphic Design...)"
            value={formData.skills}
            onChange={(e) => updateField("skills", e.target.value)}
            rows={3}
          />
        </FormField>
      </div>

      <Separator />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Employment History</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEmployment}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Employment
          </Button>
        </div>
        {employment.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No employment history added. Click &quot;Add Employment&quot; to add your work experience.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {employment.map((emp, index) => (
              <div key={index} className="relative rounded-lg border bg-muted/30 p-4 dark:bg-muted/10">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Employment #{index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeEmployment(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Company/Organization">
                    <Input
                      placeholder="Company name"
                      value={emp.company}
                      onChange={(e) => updateEmployment(index, "company", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Position">
                    <Input
                      placeholder="Job title"
                      value={emp.position}
                      onChange={(e) => updateEmployment(index, "position", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Duration">
                    <Input
                      placeholder="e.g., June 2023 - Present"
                      value={emp.duration}
                      onChange={(e) => updateEmployment(index, "duration", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Description">
                    <Input
                      placeholder="Brief description of duties"
                      value={emp.description}
                      onChange={(e) => updateEmployment(index, "description", e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Step 8: Trainings & Seminars
function Step8Trainings({ formData, updateField }: StepProps) {
  const trainings = formData.trainings || [];

  const addTraining = () => {
    updateField("trainings", [
      ...trainings,
      { name: "", organizer: "", date: "", duration: "" },
    ]);
  };

  const removeTraining = (index: number) => {
    updateField(
      "trainings",
      trainings.filter((_, i) => i !== index)
    );
  };

  const updateTraining = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...trainings];
    updated[index] = { ...updated[index], [field]: value };
    updateField("trainings", updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          List any trainings, seminars, or workshops you have attended.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTraining}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Training
        </Button>
      </div>

      {trainings.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No trainings added. Click &quot;Add Training&quot; to add seminars you&apos;ve attended.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trainings.map((training, index) => (
            <div key={index} className="relative rounded-lg border bg-muted/30 p-4 dark:bg-muted/10">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Training #{index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeTraining(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Training/Seminar Name">
                  <Input
                    placeholder="Training name"
                    value={training.name}
                    onChange={(e) => updateTraining(index, "name", e.target.value)}
                  />
                </FormField>
                <FormField label="Organizer">
                  <Input
                    placeholder="e.g., DICT, DepEd"
                    value={training.organizer}
                    onChange={(e) => updateTraining(index, "organizer", e.target.value)}
                  />
                </FormField>
                <FormField label="Date">
                  <Input
                    type="date"
                    value={training.date}
                    onChange={(e) => updateTraining(index, "date", e.target.value)}
                  />
                </FormField>
                <FormField label="Duration">
                  <Input
                    placeholder="e.g., 3 days, 1 week"
                    value={training.duration}
                    onChange={(e) => updateTraining(index, "duration", e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Step 9: Character References
function Step9References({ formData, updateField }: StepProps) {
  const references = formData.references || [];

  const addReference = () => {
    updateField("references", [
      ...references,
      { name: "", position: "", organization: "", phone: "", email: "", relationship: "" },
    ]);
  };

  const removeReference = (index: number) => {
    updateField(
      "references",
      references.filter((_, i) => i !== index)
    );
  };

  const updateReference = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    updateField("references", updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Provide at least 3 character references who can vouch for your character and work ethic.
      </p>

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addReference}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Reference
        </Button>
      </div>

      {references.map((ref, index) => (
        <div key={index} className="relative rounded-lg border bg-muted/30 p-4 dark:bg-muted/10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">
              Reference #{index + 1}
            </span>
            {references.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeReference(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Full Name">
              <Input
                placeholder="Reference's full name"
                value={ref.name}
                onChange={(e) => updateReference(index, "name", e.target.value)}
              />
            </FormField>
            <FormField label="Position/Title">
              <Input
                placeholder="e.g., Professor, Manager"
                value={ref.position}
                onChange={(e) => updateReference(index, "position", e.target.value)}
              />
            </FormField>
            <FormField label="Organization/Company">
              <Input
                placeholder="Organization name"
                value={ref.organization}
                onChange={(e) => updateReference(index, "organization", e.target.value)}
              />
            </FormField>
            <FormField label="Relationship">
              <Input
                placeholder="e.g., Professor, Former Supervisor"
                value={ref.relationship}
                onChange={(e) => updateReference(index, "relationship", e.target.value)}
              />
            </FormField>
            <FormField label="Phone">
              <Input
                placeholder="09123456789"
                value={ref.phone}
                onChange={(e) => updateReference(index, "phone", e.target.value)}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                placeholder="email@example.com"
                value={ref.email}
                onChange={(e) => updateReference(index, "email", e.target.value)}
              />
            </FormField>
          </div>
        </div>
      ))}
    </div>
  );
}

// Step 10: Documents (required: photo, resume, gradeReport only)
function Step10Documents({
  formData,
  updateField,
  errors,
  handlePhotoSelect,
}: StepProps & { handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        All documents below are <span className="font-semibold text-destructive">required</span>. Please prepare them before proceeding.
      </p>

      {/* Photo */}
      <FormField label="2x2 ID Photo" error={errors.photo} required>
        {formData.photo ? (
          <div className="relative inline-block">
            <div className="h-32 w-32 overflow-hidden rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
              <img
                src={formData.photo}
                alt="ID Photo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3.5 w-3.5" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 gap-1.5 text-xs text-muted-foreground"
              onClick={() => document.getElementById("photo-upload")?.click()}
            >
              Change Photo
            </Button>
          </div>
        ) : (
          <div
            onClick={() => document.getElementById("photo-upload")?.click()}
            className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 transition-colors hover:border-blue-400 hover:bg-muted/50 dark:bg-muted/10"
          >
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-5 w-5 text-blue-700 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Upload 2x2</span>
            <span className="text-[10px] text-muted-foreground">JPG/PNG, max 2MB</span>
          </div>
        )}
        <input
          id="photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </FormField>

      <Separator />

      {/* Resume */}
      <FileUpload
        type="resume"
        value={formData.resume}
        onChange={(v) => updateField("resume", v)}
        label="Resume / Curriculum Vitae"
        description="PDF format, max 5MB"
        accept=".pdf"
        required
      />

      {/* Grade Report */}
      <FileUpload
        type="gradeReport"
        value={formData.gradeReport}
        onChange={(v) => updateField("gradeReport", v)}
        label="Report Card / Grades"
        description="PDF format, max 5MB"
        accept=".pdf"
        required
      />
    </div>
  );
}

// Step 11: Essay Questions
function Step11Essays({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Please answer the following essay questions thoughtfully. Each answer should be at least 50 characters.
      </p>

      <FormField label="Why do you want to become a Student Assistant?" error={errors.essayWhyApply} required>
        <Textarea
          placeholder="Share your motivation for applying to the Student Assistant program..."
          value={formData.essayWhyApply}
          onChange={(e) => updateField("essayWhyApply", e.target.value)}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {formData.essayWhyApply.length < 50 ? `${50 - formData.essayWhyApply.length} more characters needed` : `${formData.essayWhyApply.length} characters (minimum met)`}
        </p>
      </FormField>

      <FormField label="What are your goals as a Student Assistant?" error={errors.essayGoals} required>
        <Textarea
          placeholder="Describe what you hope to achieve and learn as a Student Assistant..."
          value={formData.essayGoals}
          onChange={(e) => updateField("essayGoals", e.target.value)}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {formData.essayGoals.length < 50 ? `${50 - formData.essayGoals.length} more characters needed` : `${formData.essayGoals.length} characters (minimum met)`}
        </p>
      </FormField>

      <FormField label="What skills can you contribute to the SA program?" error={errors.essaySkills} required>
        <Textarea
          placeholder="Highlight the skills and abilities you can bring to the program and your assigned office..."
          value={formData.essaySkills}
          onChange={(e) => updateField("essaySkills", e.target.value)}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {formData.essaySkills.length < 50 ? `${50 - formData.essaySkills.length} more characters needed` : `${formData.essaySkills.length} characters (minimum met)`}
        </p>
      </FormField>

      <FormField label="How do you plan to balance your academics and SA duties?" error={errors.essayChallenges} required>
        <Textarea
          placeholder="Explain your time management strategies and how you plan to handle both responsibilities..."
          value={formData.essayChallenges}
          onChange={(e) => updateField("essayChallenges", e.target.value)}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {formData.essayChallenges.length < 50 ? `${50 - formData.essayChallenges.length} more characters needed` : `${formData.essayChallenges.length} characters (minimum met)`}
        </p>
      </FormField>
    </div>
  );
}

// Step 12: Review & Submit
function Step12Review({
  formData,
  updateField,
  errors,
  goToStep,
  onSubmitClick,
}: StepProps & { goToStep: (step: number) => void; onSubmitClick: () => void }) {
  return (
    <div className="space-y-6">
      {/* Red Warning Box */}
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-400">
              ⚠️ Important: Please review all information carefully. Any errors may result in
              further processing delays or rejection of your application.
            </h3>
          </div>
        </div>
      </div>

      {/* Email Input */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
        <FormField label="Contact Email Address" error={errors.email} required>
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We will use this email to send you updates about your application.
          </p>
        </FormField>
      </div>

      {/* Review Section */}
      <ReviewSection data={formData} onEditStep={goToStep} />

      {/* Confirmations — Larger checkboxes */}
      <div className="space-y-4 rounded-lg border p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-2">
            <Checkbox
              id="confirmAccurate"
              checked={!!formData.confirmAccurate}
              onCheckedChange={(v) => updateField("confirmAccurate", (v === true) as true)}
              className="h-5 w-5"
            />
          </div>
          <div>
            <Label htmlFor="confirmAccurate" className="text-sm font-semibold leading-relaxed cursor-pointer">
              I confirm that all information provided is true and accurate to the best of my knowledge.
            </Label>
            {errors.confirmAccurate && (
              <p className="mt-1 text-sm font-medium text-destructive">{errors.confirmAccurate}</p>
            )}
          </div>
        </div>
        <Separator />
        <div className="flex items-start gap-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-2">
            <Checkbox
              id="agreeTerms"
              checked={!!formData.agreeTerms}
              onCheckedChange={(v) => updateField("agreeTerms", (v === true) as true)}
              className="h-5 w-5"
            />
          </div>
          <div>
            <Label htmlFor="agreeTerms" className="text-sm font-semibold leading-relaxed cursor-pointer">
              I agree to the terms and conditions of the Student Assistant Program.
            </Label>
            {errors.agreeTerms && (
              <p className="mt-1 text-sm font-medium text-destructive">{errors.agreeTerms}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
