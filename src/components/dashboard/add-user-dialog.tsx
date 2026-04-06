"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BetterSelect } from "@/components/ui/better-select";
import { SelectItem } from "@/components/ui/select";
import {
  GraduationCap,
  UserPlus,
  Shield,
  Award,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Building2,
  Mail,
  Phone,
  Calendar,
  Hash,
  User,
  Eye,
  EyeOff,
  Clipboard,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──
type UserType = "STUDENT_ASSISTANT" | "OFFICER" | "ADVISER";

interface Office {
  id: string;
  name: string;
  code: string | null;
}

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

// ── Constants ──
const UMAK_COLLEGES = [
  "College of Accountancy and Business (CAB)",
  "College of Arts and Sciences (CAS)",
  "College of Computer Studies (CCS)",
  "College of Criminal Justice (CCJ)",
  "College of Education (CED)",
  "College of Engineering and Architecture (CEA)",
  "College of Hospitality Management (CHM)",
  "College of Law (CL)",
  "College of Maritime Education (CME)",
  "College of Medical Laboratory Science (CMLS)",
  "College of Nursing (CN)",
  "College of Pharmacy (CP)",
  "College of Physical Therapy (CPT)",
  "Graduate School",
];

const OFFICER_POSITIONS = [
  { value: "VICE_PRESIDENT_INTERNAL", label: "Vice President - Internal" },
  { value: "VICE_PRESIDENT_EXTERNAL", label: "Vice President - External" },
  { value: "SECRETARY", label: "Secretary" },
  { value: "TREASURER", label: "Treasurer" },
  { value: "AUDITOR", label: "Auditor" },
  { value: "PUBLIC_RELATION_OFFICER", label: "Public Relation Officer" },
];

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const SEX_OPTIONS = ["Male", "Female", "Prefer not to say"];

function getDefaultPassword(userType: UserType): string {
  switch (userType) {
    case "STUDENT_ASSISTANT":
      return "UMAKSAS_SA_2026";
    case "OFFICER":
      return "UMAKSAS_OFFICER_2026";
    case "ADVISER":
      return "UMAKSAS_ADVISER_2026";
  }
}

function formatPosition(pos: string): string {
  return pos.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ──
export function AddUserDialog({ open, onOpenChange, onUserCreated }: AddUserDialogProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Form fields ──
  const [formData, setFormData] = useState({
    // Common required
    email: "",
    firstName: "",
    lastName: "",
    // Common optional
    middleName: "",
    phone: "",
    // SA/Officer fields
    suffix: "",
    studentNumber: "",
    college: "",
    program: "",
    yearLevel: "",
    sex: "",
    dateOfBirth: "",
    officeId: "",
    customOffice: "",
    // Officer-specific
    position: "",
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(0);
      setUserType(null);
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        middleName: "",
        phone: "",
        suffix: "",
        studentNumber: "",
        college: "",
        program: "",
        yearLevel: "",
        sex: "",
        dateOfBirth: "",
        officeId: "",
        customOffice: "",
        position: "",
      });
      setShowPassword(false);
      fetchOffices();
    }
  }, [open]);

  const fetchOffices = useCallback(async () => {
    try {
      setOfficesLoading(true);
      const res = await fetch("/api/offices?limit=1000");
      if (!res.ok) return;
      const data = await res.json();
      setOffices((data.offices || []).map((o: { id: string; name: string; code: string | null }) => ({
        id: o.id,
        name: o.name,
        code: o.code,
      })));
    } catch {
      // Ignore
    } finally {
      setOfficesLoading(false);
    }
  }, []);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Validation ──
  const validateStep1 = (): boolean => {
    if (!userType) {
      toast.error("Please select a user type");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!formData.firstName.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error("Last name is required");
      return false;
    }
    if (userType === "OFFICER" && !formData.position) {
      toast.error("Officer position is required");
      return false;
    }
    if (formData.customOffice.trim() && formData.officeId) {
      toast.error("Please select an existing office OR enter a custom office, not both");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && validateStep1()) {
      setStep(1);
    } else if (step === 1 && validateStep2()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!userType) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        userType,
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      };

      // Optional common fields
      if (formData.middleName.trim()) payload.middleName = formData.middleName.trim();
      if (formData.phone.trim()) payload.phone = formData.phone.trim();

      if (userType !== "ADVISER") {
        // SA/Officer fields
        if (formData.suffix.trim()) payload.suffix = formData.suffix.trim();
        if (formData.studentNumber.trim()) payload.studentNumber = formData.studentNumber.trim();
        if (formData.college) payload.college = formData.college;
        if (formData.program.trim()) payload.program = formData.program.trim();
        if (formData.yearLevel) payload.yearLevel = formData.yearLevel;
        if (formData.sex) payload.sex = formData.sex;
        if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
        if (formData.officeId) payload.officeId = formData.officeId;
        if (formData.customOffice.trim()) payload.customOffice = formData.customOffice.trim();
      }

      if (userType === "OFFICER") {
        payload.position = formData.position;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      toast.success("User created successfully!", {
        description: `${formData.firstName} ${formData.lastName} — Password: ${getDefaultPassword(userType)}`,
        duration: 6000,
      });

      onOpenChange(false);
      onUserCreated?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const defaultPassword = userType ? getDefaultPassword(userType) : "";

  const copyPassword = () => {
    navigator.clipboard.writeText(defaultPassword);
    toast.success("Password copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            {step === 0 && "Select the type of user you want to create"}
            {step === 1 && `Fill in the details for the ${userType === "STUDENT_ASSISTANT" ? "Student Assistant" : userType === "OFFICER" ? "SA & Officer" : "Adviser"}`}
            {step === 2 && "Review the information and confirm"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step Indicator ── */}
        <div className="flex items-center justify-center gap-2 py-2">
          {["Type", "Details", "Confirm"].map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  idx <= step
                    ? "bg-[#1e3a8a] text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {idx < step ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span className={`text-xs font-medium ${idx <= step ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>
                {label}
              </span>
              {idx < 2 && <ChevronRight className="h-3 w-3 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* ── Step 0: User Type Selection ── */}
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-3 py-2">
            {[
              {
                type: "STUDENT_ASSISTANT" as UserType,
                title: "Student Assistant",
                description: "SA member assigned to an office",
                icon: GraduationCap,
                color: "bg-blue-50 border-blue-200 hover:border-blue-400 dark:bg-blue-950/30 dark:border-blue-800 dark:hover:border-blue-600",
                iconColor: "text-blue-600 dark:text-blue-400",
              },
              {
                type: "OFFICER" as UserType,
                title: "SA & Officer",
                description: "SA with an officer position",
                icon: Award,
                color: "bg-amber-50 border-amber-200 hover:border-amber-400 dark:bg-amber-950/30 dark:border-amber-800 dark:hover:border-amber-600",
                iconColor: "text-amber-600 dark:text-amber-400",
              },
              {
                type: "ADVISER" as UserType,
                title: "Adviser",
                description: "Faculty adviser for the organization",
                icon: Shield,
                color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:border-emerald-600",
                iconColor: "text-emerald-600 dark:text-emerald-400",
              },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = userType === item.type;
              return (
                <Card
                  key={item.type}
                  className={`cursor-pointer transition-all duration-150 border-2 ${
                    isSelected
                      ? item.color + " ring-2 ring-offset-2 ring-[#1e3a8a]/30 dark:ring-offset-gray-900"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                  onClick={() => setUserType(item.type)}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      isSelected ? `${item.color.split(" ")[0]} dark:bg-opacity-50` : "bg-gray-50 dark:bg-gray-800"
                    }`}>
                      <Icon className={`h-6 w-6 ${item.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    {isSelected && (
                      <Badge variant="secondary" className="text-[10px] bg-[#1e3a8a]/10 text-[#1e3a8a] dark:bg-blue-400/20 dark:text-blue-300">
                        <Check className="h-3 w-3 mr-0.5" /> Selected
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Step 1: Form ── */}
        {step === 1 && userType && (
          <div className="space-y-6 py-2">
            {/* Full Name Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Full Name</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Dela Cruz"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="middleName" className="text-xs">Middle Name</Label>
                  <Input
                    id="middleName"
                    placeholder="Santos"
                    value={formData.middleName}
                    onChange={(e) => updateField("middleName", e.target.value)}
                    className="h-9"
                  />
                </div>
                {userType !== "ADVISER" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="suffix" className="text-xs">Suffix</Label>
                    <Input
                      id="suffix"
                      placeholder="Jr., Sr., III"
                      value={formData.suffix}
                      onChange={(e) => updateField("suffix", e.target.value)}
                      className="h-9"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="juan.delacruz@umak.edu.ph"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Contact Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="09123456789"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* SA-specific fields (hidden for ADVISER) */}
            {userType !== "ADVISER" && (
              <>
                {/* Academic Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" /> Academic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="studentNumber" className="text-xs flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Student Number
                      </Label>
                      <Input
                        id="studentNumber"
                        placeholder="2025-00001"
                        value={formData.studentNumber}
                        onChange={(e) => updateField("studentNumber", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">College</Label>
                      <BetterSelect
                        value={formData.college}
                        onValueChange={(v) => updateField("college", v)}
                        placeholder="Select college..."
                      >
                        {UMAK_COLLEGES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </BetterSelect>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="program" className="text-xs">Program</Label>
                      <Input
                        id="program"
                        placeholder="BS Computer Science"
                        value={formData.program}
                        onChange={(e) => updateField("program", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Year Level</Label>
                      <BetterSelect
                        value={formData.yearLevel}
                        onValueChange={(v) => updateField("yearLevel", v)}
                        placeholder="Select year..."
                      >
                        {YEAR_LEVELS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </BetterSelect>
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sex</Label>
                      <BetterSelect
                        value={formData.sex}
                        onValueChange={(v) => updateField("sex", v)}
                        placeholder="Select..."
                      >
                        {SEX_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </BetterSelect>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dateOfBirth" className="text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Date of Birth
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateField("dateOfBirth", e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Office Assignment */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" /> Office Assignment
                  </h4>
                  <div className="space-y-3">
                    <BetterSelect
                      value={formData.officeId}
                      onValueChange={(v) => updateField("officeId", v)}
                      placeholder={officesLoading ? "Loading offices..." : "Select existing office..."}
                      disabled={officesLoading}
                    >
                      {offices.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} {o.code ? `(${o.code})` : ""}
                        </SelectItem>
                      ))}
                    </BetterSelect>
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-muted-foreground">or create new</span>
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <Input
                      placeholder="Enter new office name..."
                      value={formData.customOffice}
                      onChange={(e) => updateField("customOffice", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Officer Position (only for OFFICER type) */}
            {userType === "OFFICER" && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                  <Award className="h-4 w-4" /> Officer Position
                </h4>
                <div className="space-y-1.5">
                  <BetterSelect
                    value={formData.position}
                    onValueChange={(v) => updateField("position", v)}
                    placeholder="Select position..."
                  >
                    {OFFICER_POSITIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </BetterSelect>
                  <p className="text-[11px] text-muted-foreground">
                    Note: The PRESIDENT position is reserved and cannot be assigned here.
                  </p>
                </div>
              </div>
            )}

            {/* Adviser-specific: Date of Birth */}
            {userType === "ADVISER" && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Additional Information</h4>
                <div className="space-y-1.5">
                  <Label htmlFor="adviserDob" className="text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date of Birth
                  </Label>
                  <Input
                    id="adviserDob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    className="h-9 w-fit"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Review & Confirm ── */}
        {step === 2 && userType && (
          <div className="space-y-5 py-2">
            {/* User Type Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  userType === "STUDENT_ASSISTANT"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : userType === "OFFICER"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                }
              >
                {userType === "STUDENT_ASSISTANT"
                  ? "Student Assistant"
                  : userType === "OFFICER"
                    ? "SA & Officer"
                    : "Adviser"}
              </Badge>
              {userType === "OFFICER" && formData.position && (
                <Badge variant="outline" className="text-xs">
                  {formatPosition(formData.position)}
                </Badge>
              )}
            </div>

            {/* Summary Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="rounded-lg border p-3 space-y-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Info</h5>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 text-sm">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">
                        {formData.firstName} {formData.middleName && `${formData.middleName} `}{formData.lastName}
                        {formData.suffix && `, ${formData.suffix}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{formData.email}</span>
                  </div>
                  {formData.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{formData.phone}</span>
                    </div>
                  )}
                  {formData.dateOfBirth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{new Date(formData.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic / Assignment Info */}
              {userType !== "ADVISER" && (
                <div className="rounded-lg border p-3 space-y-2">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Academic & Assignment</h5>
                  <div className="space-y-1.5">
                    {formData.studentNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{formData.studentNumber}</span>
                      </div>
                    )}
                    {formData.college && (
                      <div className="flex items-start gap-2 text-sm">
                        <GraduationCap className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="break-words">{formData.college}</span>
                      </div>
                    )}
                    {(formData.program || formData.yearLevel) && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <span>{formData.program}{formData.yearLevel ? ` — ${formData.yearLevel}` : ""}</span>
                      </div>
                    )}
                    {formData.sex && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <span>{formData.sex}</span>
                      </div>
                    )}
                    {(formData.officeId || formData.customOffice) && (
                      <div className="flex items-start gap-2 text-sm">
                        <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="break-words">
                          {formData.customOffice
                            ? formData.customOffice
                            : offices.find((o) => o.id === formData.officeId)?.name || formData.officeId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Password / Credentials */}
            <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2">
                Account Credentials
              </h5>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-20 shrink-0">Email:</span>
                  <span className="font-mono text-xs break-all">{formData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-20 shrink-0">Password:</span>
                  <span className="font-mono text-xs">
                    {showPassword ? defaultPassword : "••••••••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-1 text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300"
                    title="Copy password"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                Please share these credentials securely with the new user. They should change their password upon first login.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="flex gap-2 sm:gap-0">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 2 && (
            <Button onClick={handleNext} className="gap-1.5 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-1.5 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
