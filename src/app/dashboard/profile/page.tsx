"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  User,
  Camera,
  Trash2,
  Mail,
  Phone,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Save,
  GraduationCap,
  Building2,
  Hash,
  CalendarDays,
  Clock,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

// Types
interface SAProfileData {
  id: string;
  studentNumber: string | null;
  college: string | null;
  program: string | null;
  yearLevel: string | null;
  academicYear: string | null;
  semester: string | null;
  employeeId: string | null;
  dateHired: string | null;
  status: string;
  totalHoursWorked: number;
  hoursThisSemester: number;
  isOnDuty: boolean;
  lastClockIn: string | null;
  office: {
    id: string;
    name: string;
    code: string | null;
    email: string | null;
    location: string | null;
  } | null;
}

interface OfficerProfileData {
  id: string;
  position: string;
  orderIndex: number;
  email: string | null;
  phone: string | null;
}

interface ProfileData {
  id: string;
  email: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  profile: SAProfileData | null;
  officerProfile: OfficerProfileData | null;
}

const officerPositionLabels: Record<string, string> = {
  ADVISER: "Adviser",
  PRESIDENT: "President",
  VICE_PRESIDENT_INTERNAL: "Vice President - Internal",
  VICE_PRESIDENT_EXTERNAL: "Vice President - External",
  SECRETARY: "Secretary",
  TREASURER: "Treasurer",
  AUDITOR: "Auditor",
  PUBLIC_RELATION_OFFICER: "Public Relations Officer",
};

const roleConfig: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: {
    label: "Super Administrator",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  ADVISER: {
    label: "SA Adviser",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  OFFICER: {
    label: "Organization Officer",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  OFFICE_SUPERVISOR: {
    label: "Office Supervisor",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  HRMO: {
    label: "HRMO",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  STUDENT_ASSISTANT: {
    label: "Student Assistant",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  APPLICANT: {
    label: "Applicant",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
  PUBLIC_VISITOR: {
    label: "Visitor",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
};

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.charAt(0) || "";
  const l = lastName?.charAt(0) || "";
  return `${f}${l}`.toUpperCase() || "?";
}

function getFullName(data: { firstName: string | null; middleName: string | null; lastName: string | null; suffix: string | null }): string {
  return [data.firstName, data.middleName ? `${data.middleName.charAt(0)}.` : null, data.lastName, data.suffix || null]
    .filter(Boolean)
    .join(" ")
    .trim() || "No Name";
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  // Profile data
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form state
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [phone, setPhone] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Action states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Dialog states
  const [removePhotoDialogOpen, setRemovePhotoDialogOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      const user: ProfileData = data.user;
      setProfile(user);

      // Populate form
      setFirstName(user.firstName || "");
      setMiddleName(user.middleName || "");
      setLastName(user.lastName || "");
      setSuffix(user.suffix || "");
      setPhone(user.phone || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be less than 5MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "photo");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json();
        throw new Error(uploadData.error || "Failed to upload photo");
      }

      const uploadData = await uploadRes.json();

      // Update profile with new photo URL
      const profileRes = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: uploadData.url }),
      });

      if (!profileRes.ok) {
        throw new Error("Failed to update profile photo");
      }

      toast.success("Profile photo updated successfully");
      fetchProfile();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle photo removal
  const handleRemovePhoto = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: "" }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove photo");
      }

      toast.success("Profile photo removed");
      setRemovePhotoDialogOpen(false);
      fetchProfile();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove photo");
    }
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!lastName.trim()) {
      toast.error("Last name is required");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          middleName: middleName.trim() || null,
          lastName: lastName.trim(),
          suffix: suffix.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      toast.success("Profile updated successfully");
      fetchProfile();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Loading skeleton
  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Profile header skeleton */}
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-blue-800 to-blue-600" />
          <CardContent className="p-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4 -mt-12">
              <Skeleton className="h-24 w-24 rounded-full border-4 border-white dark:border-slate-800" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const fullName = getFullName(profile);
  const initials = getInitials(profile.firstName, profile.lastName);
  const roleInfo = roleConfig[profile.role] || roleConfig.PUBLIC_VISITOR;
  const isSA = profile.role === "STUDENT_ASSISTANT";
  const isOfficer = ["OFFICER", "ADVISER"].includes(profile.role);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage your account information
          </p>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden shadow-lg">
        {/* Banner */}
        <div className="h-28 sm:h-32 bg-gradient-to-r from-[#1e3a8a] via-[#1e3a8a] to-[#0f2567] relative">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 h-16 w-16 rounded-full bg-white/20" />
            <div className="absolute bottom-2 right-16 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute top-8 right-1/3 h-12 w-12 rounded-full bg-white/15" />
          </div>
          {/* Gold accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C5A000] to-transparent" />
        </div>

        <CardContent className="p-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-12">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden bg-[#1e3a8a]/10">
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#0f2567] text-white text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>

              {/* Photo action overlay */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 -m-4">
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                    title="Change Photo"
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e3a8a]" />
                    ) : (
                      <Camera className="h-4 w-4 text-[#1e3a8a]" />
                    )}
                  </button>
                  {profile.photoUrl && (
                    <button
                      onClick={() => setRemovePhotoDialogOpen(true)}
                      className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                      title="Remove Photo"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Online indicator */}
              {isSA && profile.profile?.isOnDuty && (
                <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-800">
                  <div className="h-full w-full rounded-full bg-green-400 animate-ping opacity-75" />
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Name & Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {fullName}
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 mt-1.5">
                <Badge className={`${roleInfo.color} font-medium`} variant="secondary">
                  <Shield className="mr-1.5 h-3 w-3" />
                  {roleInfo.label}
                </Badge>
                {isOfficer && profile.officerProfile && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium" variant="secondary">
                    <Award className="mr-1.5 h-3 w-3" />
                    {officerPositionLabels[profile.officerProfile.position] || profile.officerProfile.position}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {profile.phone}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Join date */}
            <div className="hidden sm:block text-right">
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {format(new Date(profile.createdAt), "MMM d, yyyy")}
              </p>
              {profile.lastLoginAt && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">Last login</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(profile.lastLoginAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information Card */}
        <Card className="shadow-lg">
          <div className="flex items-center gap-3 p-4 sm:p-6 pb-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a8a]/10">
              <User className="h-5 w-5 text-[#1e3a8a]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Personal Information
              </h3>
              <p className="text-xs text-muted-foreground">Update your personal details</p>
            </div>
          </div>
          <Separator className="mt-4" />
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* First Name */}
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="h-9"
                />
              </div>

              {/* Middle Name */}
              <div className="space-y-1.5">
                <Label htmlFor="middleName" className="text-sm font-medium">
                  Middle Name
                </Label>
                <Input
                  id="middleName"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Enter middle name"
                  className="h-9"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="h-9"
                />
              </div>

              {/* Suffix */}
              <div className="space-y-1.5">
                <Label htmlFor="suffix" className="text-sm font-medium">
                  Suffix
                </Label>
                <Input
                  id="suffix"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="e.g. Jr., Sr., III"
                  className="h-9"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 09123456789"
                    className="h-9 pl-9"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    value={profile.email}
                    readOnly
                    disabled
                    className="h-9 pl-9 bg-slate-50 dark:bg-slate-900 text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Email cannot be changed. Contact admin if needed.</p>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white"
                >
                  {isSavingProfile ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card className="shadow-lg">
          <div className="flex items-center gap-3 p-4 sm:p-6 pb-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Change Password
              </h3>
              <p className="text-xs text-muted-foreground">Update your account password</p>
            </div>
          </div>
          <Separator className="mt-4" />
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-sm font-medium">
                  Current Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-9 pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    className="h-9 pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {newPassword.length < 8
                        ? "Must be at least 8 characters"
                        : "Use uppercase, numbers, and symbols for a stronger password"}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={`h-9 pl-9 pr-9 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-red-300 focus-visible:ring-red-300 dark:border-red-700"
                        : confirmPassword && confirmPassword === newPassword
                          ? "border-green-300 focus-visible:ring-green-300 dark:border-green-700"
                          : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-red-500">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Update Password Button */}
              <div className="pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  {isChangingPassword ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  Update Password
                </Button>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> Passwords are stored in the system for authentication purposes. Make sure to use a strong, unique password.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Information Card (SA only) */}
      {isSA && profile.profile && (
        <Card className="shadow-lg">
          <div className="flex items-center gap-3 p-4 sm:p-6 pb-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Work Information
              </h3>
              <p className="text-xs text-muted-foreground">Your SA assignment and work details</p>
            </div>
            {profile.profile.isOnDuty && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ml-auto" variant="secondary">
                <Clock className="mr-1 h-3 w-3 animate-pulse" />
                On Duty
              </Badge>
            )}
          </div>
          <Separator className="mt-4" />
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* College */}
              {profile.profile.college && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">College</p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.profile.college}</p>
                  {profile.profile.program && (
                    <p className="text-xs text-muted-foreground mt-0.5">{profile.profile.program}</p>
                  )}
                </div>
              )}

              {/* Year Level */}
              {profile.profile.yearLevel && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Year Level</p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.profile.yearLevel}</p>
                  {profile.profile.semester && profile.profile.academicYear && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {profile.profile.semester} • {profile.profile.academicYear}
                    </p>
                  )}
                </div>
              )}

              {/* Student Number */}
              {profile.profile.studentNumber && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Student Number</p>
                  </div>
                  <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{profile.profile.studentNumber}</p>
                </div>
              )}

              {/* Employee ID */}
              {profile.profile.employeeId && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Employee ID</p>
                  </div>
                  <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{profile.profile.employeeId}</p>
                </div>
              )}

              {/* Office Assignment */}
              {profile.profile.office && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-3 sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Office Assignment</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{profile.profile.office.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {profile.profile.office.code && (
                      <span className="text-xs text-muted-foreground">Code: {profile.profile.office.code}</span>
                    )}
                    {profile.profile.office.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {profile.profile.office.email}
                      </span>
                    )}
                    {profile.profile.office.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {profile.profile.office.location}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Hours Worked */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Hours Worked</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{profile.profile.totalHoursWorked.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{profile.profile.hoursThisSemester.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">This Semester</p>
                  </div>
                </div>
              </div>

              {/* Date Hired */}
              {profile.profile.dateHired && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Date Hired</p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {format(new Date(profile.profile.dateHired), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Officer Information Card */}
      {isOfficer && profile.officerProfile && (
        <Card className="shadow-lg">
          <div className="flex items-center gap-3 p-4 sm:p-6 pb-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Officer Information
              </h3>
              <p className="text-xs text-muted-foreground">Your position and responsibilities</p>
            </div>
          </div>
          <Separator className="mt-4" />
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Position */}
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 p-3 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Position</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {officerPositionLabels[profile.officerProfile.position] || profile.officerProfile.position}
                </p>
              </div>

              {/* Officer Email */}
              {profile.officerProfile.email && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Officer Email</p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.officerProfile.email}</p>
                </div>
              )}

              {/* Officer Phone */}
              {profile.officerProfile.phone && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Officer Phone</p>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.officerProfile.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Status Card */}
      <Card className="shadow-lg">
        <div className="flex items-center gap-3 p-4 sm:p-6 pb-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <Shield className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Account Status
            </h3>
            <p className="text-xs text-muted-foreground">Your account information and timestamps</p>
          </div>
        </div>
        <Separator className="mt-4" />
        <CardContent className="p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Account Status</p>
              <Badge
                className={profile.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }
                variant="secondary"
              >
                {profile.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Account Created</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {format(new Date(profile.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {format(new Date(profile.updatedAt), "MMM d, yyyy")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Login</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {profile.lastLoginAt
                  ? format(new Date(profile.lastLoginAt), "MMM d, yyyy 'at' h:mm a")
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove Photo Confirmation Dialog */}
      <AlertDialog open={removePhotoDialogOpen} onOpenChange={setRemovePhotoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile photo? This will revert to showing your initials as your avatar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePhoto}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
