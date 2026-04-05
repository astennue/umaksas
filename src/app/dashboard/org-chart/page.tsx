"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Network, Save, Loader2, User, Upload, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { RoleGuard } from "@/components/auth/role-guard";

// ============================================
// Types
// ============================================

interface OrgChartData {
  presidentName: string;
  presidentTitle: string;
  presidentEmail: string | null;
  presidentPhotoUrl: string | null;
  vpName: string;
  vpTitle: string;
  vpEmail: string | null;
  vpPhotoUrl: string | null;
  adviserName: string;
  adviserTitle: string;
  adviserEmail: string | null;
}

// ============================================
// Loading Skeleton
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {/* President card skeleton */}
      <Skeleton className="h-72 w-full rounded-xl" />
      {/* VP + Adviser row skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// ============================================
// Photo Upload Component
// ============================================

function PhotoUpload({
  currentUrl,
  previewUrl,
  onFileSelect,
  onRemove,
  label,
}: {
  currentUrl: string | null;
  previewUrl: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentUrl;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className={cn(
            "relative h-24 w-24 shrink-0 rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-colors",
            displayUrl
              ? "border-solid border-slate-200 dark:border-slate-700"
              : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
          )}
        >
          {displayUrl ? (
            <>
              <img
                src={displayUrl}
                alt="Photo preview"
                className="h-full w-full object-cover"
              />
              <button
                onClick={onRemove}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <User className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          )}
        </div>

        {/* Upload button */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="w-fit"
          >
            <Camera className="mr-2 h-4 w-4" />
            {displayUrl ? "Change Photo" : "Upload Photo"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileSelect}
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            JPG, PNG, or WebP. Max 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

function OrgChartCMS() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Data state
  const [data, setData] = useState<OrgChartData | null>(null);
  const [originalData, setOriginalData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [presidentName, setPresidentName] = useState("");
  const [presidentTitle, setPresidentTitle] = useState("");
  const [presidentEmail, setPresidentEmail] = useState("");
  const [vpName, setVpName] = useState("");
  const [vpTitle, setVpTitle] = useState("");
  const [vpEmail, setVpEmail] = useState("");
  const [adviserName, setAdviserName] = useState("");
  const [adviserTitle, setAdviserTitle] = useState("");
  const [adviserEmail, setAdviserEmail] = useState("");

  // Photo preview state (local before save)
  const [presidentPhotoPreview, setPresidentPhotoPreview] = useState<
    string | null
  >(null);
  const [vpPhotoPreview, setVpPhotoPreview] = useState<string | null>(null);

  // Photo URLs to save
  const [presidentPhotoUrl, setPresidentPhotoUrl] = useState<string | null>(
    null
  );
  const [vpPhotoUrl, setVpPhotoUrl] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org-chart");
      if (!res.ok) throw new Error("Failed to fetch org chart data");
      const json = await res.json();
      setData(json);
      setOriginalData(json);

      // Populate form
      setPresidentName(json.presidentName || "");
      setPresidentTitle(json.presidentTitle || "");
      setPresidentEmail(json.presidentEmail || "");
      setPresidentPhotoUrl(json.presidentPhotoUrl || null);

      setVpName(json.vpName || "");
      setVpTitle(json.vpTitle || "");
      setVpEmail(json.vpEmail || "");
      setVpPhotoUrl(json.vpPhotoUrl || null);

      setAdviserName(json.adviserName || "");
      setAdviserTitle(json.adviserTitle || "");
      setAdviserEmail(json.adviserEmail || "");
    } catch {
      toast.error("Failed to load organization chart data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for changes
  const hasChanges = (() => {
    if (!originalData) return false;
    return (
      presidentName !== (originalData.presidentName || "") ||
      presidentTitle !== (originalData.presidentTitle || "") ||
      presidentEmail !== (originalData.presidentEmail || "") ||
      presidentPhotoUrl !== (originalData.presidentPhotoUrl || null) ||
      vpName !== (originalData.vpName || "") ||
      vpTitle !== (originalData.vpTitle || "") ||
      vpEmail !== (originalData.vpEmail || "") ||
      vpPhotoUrl !== (originalData.vpPhotoUrl || null) ||
      adviserName !== (originalData.adviserName || "") ||
      adviserTitle !== (originalData.adviserTitle || "") ||
      adviserEmail !== (originalData.adviserEmail || "")
    );
  })();

  // Photo upload handler
  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "president" | "vp"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      toast.error("Invalid file type. Please use JPG, PNG, or WebP.");
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (field === "president") {
        setPresidentPhotoPreview(base64);
        setPresidentPhotoUrl(base64);
      } else {
        setVpPhotoPreview(base64);
        setVpPhotoUrl(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const handleRemovePhoto = (field: "president" | "vp") => {
    if (field === "president") {
      setPresidentPhotoPreview(null);
      setPresidentPhotoUrl(null);
    } else {
      setVpPhotoPreview(null);
      setVpPhotoUrl(null);
    }
  };

  // Save handler
  const handleSave = async () => {
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }

    const confirmed = await confirm({
      title: "Save Organization Chart",
      description:
        "Are you sure you want to update the organization chart? These changes will be visible on the public About page.",
      confirmText: "Save Changes",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch("/api/org-chart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presidentName,
          presidentTitle,
          presidentEmail: presidentEmail || null,
          presidentPhotoUrl,
          vpName,
          vpTitle,
          vpEmail: vpEmail || null,
          vpPhotoUrl,
          adviserName,
          adviserTitle,
          adviserEmail: adviserEmail || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save");
      }

      const updated = await res.json();
      setData(updated);
      setOriginalData(updated);
      setPresidentPhotoPreview(null);
      setVpPhotoPreview(null);

      toast.success("Organization chart updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Network className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          Unable to load organization chart
        </p>
        <Button variant="outline" onClick={fetchData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003366]/10">
            <Network className="h-6 w-6 text-[#003366]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Organization Chart
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage the profiles displayed on the public organization chart
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-[#003366] hover:bg-[#003366]/90 text-white min-w-[140px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You have unsaved changes
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════
          University President Card (Full Width, Prominent)
         ══════════════════════════════════════════ */}
      <Card className="overflow-hidden shadow-md border-[#003366]/20">
        <div className="h-1.5 bg-gradient-to-r from-[#003366] to-[#1e40af]" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge
              className="bg-[#003366]/10 text-[#003366] border-[#003366]/20 hover:bg-[#003366]/15 font-semibold"
            >
              Level 1
            </Badge>
            <div>
              <CardTitle className="text-lg">University President</CardTitle>
              <CardDescription>
                CMS-managed profile — no system account required
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
            {/* Photo Upload */}
            <PhotoUpload
              currentUrl={data.presidentPhotoUrl}
              previewUrl={presidentPhotoPreview}
              onFileSelect={(e) => handlePhotoUpload(e, "president")}
              onRemove={() => handleRemovePhoto("president")}
              label="Official Photo"
            />

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="presidentName">Full Name</Label>
                <Input
                  id="presidentName"
                  value={presidentName}
                  onChange={(e) => setPresidentName(e.target.value)}
                  placeholder="e.g., Dr. Elyxzur C. Ramos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="presidentTitle">Title / Position</Label>
                <Input
                  id="presidentTitle"
                  value={presidentTitle}
                  onChange={(e) => setPresidentTitle(e.target.value)}
                  placeholder="e.g., University President"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="presidentEmail">Email Address</Label>
                <Input
                  id="presidentEmail"
                  type="email"
                  value={presidentEmail}
                  onChange={(e) => setPresidentEmail(e.target.value)}
                  placeholder="e.g., president@umak.edu.ph"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
          VP + Adviser Row (Side by Side on Desktop)
         ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VP for Student Services */}
        <Card className="overflow-hidden shadow-md border-[#1e40af]/20">
          <div className="h-1 bg-gradient-to-r from-[#1e40af] to-[#3b82f6]" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-[#1e40af]/10 text-[#1e40af] border-[#1e40af]/20 hover:bg-[#1e40af]/15 font-semibold">
                Level 2
              </Badge>
              <div>
                <CardTitle className="text-lg">
                  VP for Student Services
                </CardTitle>
                <CardDescription>
                  CMS-managed profile — no system account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <PhotoUpload
              currentUrl={data.vpPhotoUrl}
              previewUrl={vpPhotoPreview}
              onFileSelect={(e) => handlePhotoUpload(e, "vp")}
              onRemove={() => handleRemovePhoto("vp")}
              label="Official Photo"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vpName">Full Name</Label>
                <Input
                  id="vpName"
                  value={vpName}
                  onChange={(e) => setVpName(e.target.value)}
                  placeholder="e.g., Mr. Virgilio B. Tabbu"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vpTitle">Title / Position</Label>
                <Input
                  id="vpTitle"
                  value={vpTitle}
                  onChange={(e) => setVpTitle(e.target.value)}
                  placeholder="e.g., Vice President for Student Services and Community Development"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vpEmail">Email Address</Label>
                <Input
                  id="vpEmail"
                  type="email"
                  value={vpEmail}
                  onChange={(e) => setVpEmail(e.target.value)}
                  placeholder="e.g., vpstudent@umak.edu.ph"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SA Adviser */}
        <Card className="overflow-hidden shadow-md border-[#059669]/20">
          <div className="h-1 bg-gradient-to-r from-[#059669] to-[#10b981]" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-[#059669]/10 text-[#059669] border-[#059669]/20 hover:bg-[#059669]/15 font-semibold">
                Level 3
              </Badge>
              <div>
                <CardTitle className="text-lg">SA Adviser</CardTitle>
                <CardDescription>
                  Linked to system adviser account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* No photo for adviser — show icon placeholder */}
            <div className="flex items-center gap-3 rounded-lg bg-[#059669]/5 border border-[#059669]/10 px-4 py-3">
              <div className="h-12 w-12 rounded-full bg-[#059669]/10 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-[#059669]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#059669]">
                  No photo upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Photo is managed via the adviser&apos;s system profile
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="adviserName">Full Name</Label>
                <Input
                  id="adviserName"
                  value={adviserName}
                  onChange={(e) => setAdviserName(e.target.value)}
                  placeholder="e.g., Mr. Alvin John Y. Abejo"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="adviserTitle">Title / Position</Label>
                <Input
                  id="adviserTitle"
                  value={adviserTitle}
                  onChange={(e) => setAdviserTitle(e.target.value)}
                  placeholder="e.g., UMak SAS Adviser"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="adviserEmail">Email Address</Label>
                <Input
                  id="adviserEmail"
                  type="email"
                  value={adviserEmail}
                  onChange={(e) => setAdviserEmail(e.target.value)}
                  placeholder="e.g., adviser@umak.edu.ph"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// Page Export with RoleGuard
// ============================================

export default function OrgChartPage() {
  return (
    <RoleGuard
      allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}
      presidentOnly
    >
      <OrgChartCMS />
    </RoleGuard>
  );
}
