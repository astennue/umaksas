"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings,
  Save,
  Loader2,
  GraduationCap,
  Calendar,
  DollarSign,
  Clock,
  ToggleLeft,
  ToggleRight,
  Shield,
  QrCode,
  Smartphone,
  FileText,
  Upload,
  X,
  AlertTriangle,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectItem } from "@/components/ui/select";
import { BetterSelect } from "@/components/ui/better-select";
import { Separator } from "@/components/ui/separator";
import { cn, safeJsonParse } from "@/lib/utils";
import { RoleGuard } from "@/components/auth/role-guard";
import { useConfirm } from "@/hooks/use-confirm";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SavingIndicator } from "@/components/ui/saving-indicator";

interface SystemSettingsData {
  id: string;
  siteName: string;
  siteDescription: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  academicYear: string | null;
  currentSemester: string | null;
  applicationOpen: boolean;
  renewalOpen: boolean;
  maxWorkHoursPerDay: number;
  monthlyPaymentFee: number;
  paymentCollectionEnabled: boolean;
  gcashQrUrl: string | null;
  gcashNumber: string | null;
  paymentInstructions: string | null;
}

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const user = session?.user as { id: string; role: string } | undefined;

  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { confirm, ConfirmDialog } = useConfirm();

  // Refs
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useKeyboardShortcuts({
    "mod+s": () => {
      handleSave();
    },
  }, { enabled: true });

  // Form fields - Academic
  const [academicYear, setAcademicYear] = useState("");
  const [currentSemester, setCurrentSemester] = useState("");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [maxWorkHours, setMaxWorkHours] = useState(4);
  const [monthlyPayment, setMonthlyPayment] = useState(20);

  // Form fields - Payment Collection
  const [paymentCollectionEnabled, setPaymentCollectionEnabled] = useState(false);
  const [gcashQrUrl, setGcashQrUrl] = useState("");
  const [gcashNumber, setGcashNumber] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  const userRole = user?.role;
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdviser = userRole === "ADVISER";
  const isOfficer = userRole === "OFFICER";
  const canModifyPaymentSettings = isSuperAdmin || isOfficer;
  const canViewPaymentSettings = isSuperAdmin || isAdviser || isOfficer;
  const canModifyAcademicSettings = isSuperAdmin || isAdviser;

  // Auth check
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/portal-login");
    }
  }, [authStatus, router]);

  // Fetch settings
  useEffect(() => {
    if (!user?.id) return;

    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/system-settings");
        if (res.ok) {
          const data = await safeJsonParse<any>(res);
          setSettings(data);
          setAcademicYear(data.academicYear || "");
          setCurrentSemester(data.currentSemester || "");
          setApplicationOpen(data.applicationOpen);
          setRenewalOpen(data.renewalOpen);
          setMaxWorkHours(data.maxWorkHoursPerDay);
          setMonthlyPayment(data.monthlyPaymentFee);
          setPaymentCollectionEnabled(data.paymentCollectionEnabled || false);
          setGcashQrUrl(data.gcashQrUrl || "");
          setGcashNumber(data.gcashNumber || "");
          setPaymentInstructions(data.paymentInstructions || "");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user?.id]);

  // QR preview state
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrSelectedFile, setQrSelectedFile] = useState<File | null>(null);

  // Preview QR before upload
  const handleQrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    setQrSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setQrPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Upload GCash QR code (after preview) — uploads & saves to DB in one step
  const handleQrUpload = async () => {
    if (!qrSelectedFile) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", qrSelectedFile);

      const res = await fetch("/api/system-settings/gcash-qr", {
        method: "POST",
        body: formData,
      });

      const data = await safeJsonParse<any>(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload QR code");
      }

      setGcashQrUrl(data.gcashQrUrl);
      // Update settings state so dirty detection doesn't flag the QR as unsaved
      setSettings((prev) => prev ? { ...prev, gcashQrUrl: data.gcashQrUrl } : prev);
      setQrPreview(null);
      setQrSelectedFile(null);
      toast.success("GCash QR code uploaded and saved successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to upload QR code");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete GCash QR code
  const handleQrDelete = async () => {
    const confirmed = await confirm({
      title: "Remove QR Code?",
      description: "This will permanently remove the GCash QR code from the system settings.",
      confirmText: "Remove",
      variant: "destructive",
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/system-settings/gcash-qr", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await safeJsonParse<any>(res);
        throw new Error(data.error || "Failed to delete QR code");
      }

      setGcashQrUrl("");
      // Update settings state so dirty detection stays clean
      setSettings((prev) => prev ? { ...prev, gcashQrUrl: null } : prev);
      toast.success("GCash QR code removed");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete QR code");
    } finally {
      setIsSaving(false);
    }
  };

  // Dirty detection for SavingIndicator
  const dirty = settings
    ? academicYear !== (settings.academicYear || "") ||
      currentSemester !== (settings.currentSemester || "") ||
      applicationOpen !== settings.applicationOpen ||
      renewalOpen !== settings.renewalOpen ||
      maxWorkHours !== settings.maxWorkHoursPerDay ||
      monthlyPayment !== settings.monthlyPaymentFee ||
      paymentCollectionEnabled !== (settings.paymentCollectionEnabled || false) ||
      gcashNumber !== (settings.gcashNumber || "") ||
      paymentInstructions !== (settings.paymentInstructions || "")
    : false;

  const handleSave = async () => {
    const confirmed = await confirm({
      title: "Save Settings?",
      description: "These changes will take effect immediately for all users.",
      confirmText: "Save",
      variant: "default",
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        academicYear: academicYear || null,
        currentSemester: currentSemester || null,
        applicationOpen,
        renewalOpen,
        maxWorkHoursPerDay: maxWorkHours,
        monthlyPaymentFee: monthlyPayment,
      };

      // Only include payment settings if user has permission
      if (canModifyPaymentSettings) {
        payload.paymentCollectionEnabled = paymentCollectionEnabled;
        // gcashQrUrl is saved separately via /api/system-settings/gcash-qr
        payload.gcashNumber = gcashNumber || null;
        payload.paymentInstructions = paymentInstructions || null;
      }

      const res = await fetch("/api/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJsonParse<any>(res);
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      // Verify the response reflects the changes
      console.log("[Settings] Save response:", data);
      if (canModifyPaymentSettings) {
        console.log("[Settings] Payment fields in response:", {
          paymentCollectionEnabled: data.paymentCollectionEnabled,
          gcashQrUrl: data.gcashQrUrl,
          gcashNumber: data.gcashNumber,
          paymentInstructions: data.paymentInstructions,
        });
      }

      toast.success("Settings saved successfully");
      setSettings(data);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session || (userRole !== "SUPER_ADMIN" && userRole !== "ADVISER" && userRole !== "OFFICER")) {
    return null;
  }

  const roleLabel = isSuperAdmin
    ? "Super Administrator Access"
    : isAdviser
      ? "Adviser Access"
      : "Officer Access";

  const roleIcon = isSuperAdmin
    ? Shield
    : isAdviser
      ? GraduationCap
      : DollarSign;

  const RoleIcon = roleIcon;

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}>
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage application and renewal seasons, academic settings, and system configuration
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-700 hover:bg-blue-800"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Save indicator row */}
      <div className="flex items-center gap-2">
        <SavingIndicator saving={isSaving} lastSaved={lastSaved} dirty={dirty} />
      </div>

      {/* Role Badge */}
      <Badge className={cn(
        "border-amber-500/20",
        isSuperAdmin
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      )} variant="secondary">
        <RoleIcon className="mr-1.5 h-3 w-3" />
        {roleLabel}
      </Badge>

      {/* Payment Collection Section - Full width */}
      {canViewPaymentSettings && (
        <Card className="border-0 shadow-lg rounded-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#004EE0]/10">
                    <Smartphone className="h-5 w-5 text-[#004EE0]" />
                  </div>
                  Payment Collection
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {canModifyPaymentSettings
                    ? "Enable GCash payment collection for organizational fees and configure payment settings"
                    : "View current payment collection settings and GCash payment details"}
                </CardDescription>
              </div>
              {canModifyPaymentSettings && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {paymentCollectionEnabled ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={paymentCollectionEnabled}
                    onCheckedChange={setPaymentCollectionEnabled}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle Banner */}
            <div className={cn(
              "flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors",
              paymentCollectionEnabled
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800"
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  paymentCollectionEnabled
                    ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                )}>
                  {paymentCollectionEnabled
                    ? <ToggleRight className="h-5 w-5" />
                    : <ToggleLeft className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Organizational Fee Collection
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paymentCollectionEnabled
                      ? "Active — Student assistants will see payment prompts"
                      : "Inactive — Payment collection is currently disabled"}
                  </p>
                </div>
              </div>
              {canModifyPaymentSettings && (
                <Switch
                  checked={paymentCollectionEnabled}
                  onCheckedChange={setPaymentCollectionEnabled}
                />
              )}
            </div>

            {/* GCash Configuration */}
            {canModifyPaymentSettings && (
              <>
                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-[#004EE0]" />
                    GCash Configuration
                  </h3>

                  {/* QR Code Upload with Preview */}
                  <div className="space-y-2">
                    <Label>GCash QR Code</Label>
                    {/* Saved QR preview */}
                    {gcashQrUrl && !qrPreview ? (
                      <div className="relative inline-block">
                        <div className="rounded-lg border p-2 bg-white">
                          <img
                            src={gcashQrUrl}
                            alt="GCash QR Code"
                            className="h-40 w-40 object-contain"
                          />
                        </div>
                        {canModifyPaymentSettings && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={handleQrDelete}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ) : null}
                    {/* File select area */}
                    {!gcashQrUrl && !qrPreview ? (
                      <div
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-[#004EE0]/50 hover:bg-[#004EE0]/5 transition-colors max-w-xs"
                        onClick={() => qrInputRef.current?.click()}
                      >
                        <input
                          ref={qrInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={handleQrFileSelect}
                        />
                        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Click to upload GCash QR code
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, or WebP (max 10MB)
                        </p>
                      </div>
                    ) : null}
                    {/* Upload preview */}
                    {qrPreview && (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <div className="rounded-lg border-2 border-[#004EE0]/30 bg-white p-2">
                            <img
                              src={qrPreview}
                              alt="QR Code Preview"
                              className="h-40 w-40 object-contain"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => { setQrPreview(null); setQrSelectedFile(null); }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleQrUpload}
                            disabled={isSaving}
                            className="bg-[#004EE0] hover:bg-[#004EE0]/90 text-white"
                          >
                            {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <QrCode className="mr-1.5 h-4 w-4" />}
                            {isSaving ? "Uploading..." : "Confirm Upload"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setQrPreview(null); setQrSelectedFile(null); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GCash Number */}
                  <div className="space-y-2">
                    <Label htmlFor="gcashNumber" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      GCash Number
                    </Label>
                    <Input
                      id="gcashNumber"
                      value={gcashNumber}
                      onChange={(e) => setGcashNumber(e.target.value)}
                      placeholder="e.g., 0917 123 4567"
                    />
                    <p className="text-xs text-muted-foreground">
                      The GCash number that student assistants will send their payments to
                    </p>
                  </div>

                  {/* Payment Instructions */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentInstructions" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Payment Instructions
                    </Label>
                    <Textarea
                      id="paymentInstructions"
                      value={paymentInstructions}
                      onChange={(e) => setPaymentInstructions(e.target.value)}
                      placeholder={"Step-by-step instructions for student assistants:\n\n1. Open GCash app\n2. Scan the QR code or enter the GCash number\n3. Send the exact amount\n4. Take a screenshot of the receipt\n5. Upload the screenshot as proof of payment"}
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      These instructions will be shown to student assistants when they pay
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Warning */}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Important:</strong> Turning ON payment collection will immediately show payment prompts to all active student assistants. Ensure the GCash QR code and number are correctly set before enabling.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Season Controls */}
        <Card className="border-0 shadow-lg rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Season Controls
            </CardTitle>
            <CardDescription>
              Toggle application and renewal seasons to allow or restrict submissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Application Season */}
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  applicationOpen
                    ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                )}>
                  {applicationOpen ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Application Season</p>
                  <p className="text-xs text-muted-foreground">
                    {applicationOpen
                      ? "New applications are being accepted"
                      : "Applications are currently closed"}
                  </p>
                </div>
              </div>
              <Switch
                checked={applicationOpen}
                onCheckedChange={setApplicationOpen}
              />
            </div>

            {/* Renewal Season */}
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  renewalOpen
                    ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                )}>
                  {renewalOpen ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Renewal Season</p>
                  <p className="text-xs text-muted-foreground">
                    {renewalOpen
                      ? "SA renewals are being accepted"
                      : "Renewals are currently closed"}
                  </p>
                </div>
              </div>
              <Switch
                checked={renewalOpen}
                onCheckedChange={setRenewalOpen}
              />
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Note:</strong> Turning ON a season will immediately allow submissions. Turning it OFF will not affect existing submissions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Academic Settings */}
        <Card className="border-0 shadow-lg rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              Academic Settings
            </CardTitle>
            <CardDescription>
              Configure academic year, semester, and payment settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canModifyAcademicSettings && (
              <>
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2025-2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Current Semester</Label>
              <BetterSelect value={currentSemester} onValueChange={setCurrentSemester} placeholder="Select semester">
                  <SelectItem value="1st Semester">1st Semester</SelectItem>
                  <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
              </BetterSelect>
            </div>

            <Separator />
              </>
            )}

            {canModifyAcademicSettings && (
              <div className="space-y-2">
              <Label htmlFor="maxWorkHours" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Max Work Hours Per Day
              </Label>
              <Input
                id="maxWorkHours"
                type="number"
                value={maxWorkHours}
                onChange={(e) => setMaxWorkHours(parseInt(e.target.value) || 4)}
                min={1}
                max={8}
              />
              <p className="text-xs text-muted-foreground">
                Maximum hours a Student Assistant can work per day (recommended: 4)
              </p>
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="monthlyPayment" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Monthly Payment Fee
              </Label>
              <Input
                id="monthlyPayment"
                type="number"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground">
                Monthly organizational fee amount for Student Assistants
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
      <Card className="border-0 shadow-lg rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Current Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Academic Year</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{academicYear || "Not set"}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Semester</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{currentSemester || "Not set"}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Application</p>
              <Badge variant="secondary" className={cn(
                applicationOpen
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              )}>
                {applicationOpen ? "Open" : "Closed"}
              </Badge>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Renewal</p>
              <Badge variant="secondary" className={cn(
                renewalOpen
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              )}>
                {renewalOpen ? "Open" : "Closed"}
              </Badge>
            </div>
            {canViewPaymentSettings && (
              <>
                <div className="rounded-lg border p-4 text-center sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Payment Collection</p>
                  <Badge variant="secondary" className={cn(
                    paymentCollectionEnabled
                      ? "bg-[#004EE0]/10 text-[#004EE0] dark:bg-[#004EE0]/20"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {paymentCollectionEnabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="rounded-lg border p-4 text-center sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">GCash Number</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{gcashNumber || "Not set"}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    <ConfirmDialog />
    </RoleGuard>
  );
}
