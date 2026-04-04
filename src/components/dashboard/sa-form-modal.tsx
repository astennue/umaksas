"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectItem } from "@/components/ui/select";
import { BetterSelect } from "@/components/ui/better-select";
import { Separator } from "@/components/ui/separator";
import { COLLEGES } from "@/lib/colleges";
import { toast } from "sonner";
import {
  User,
  GraduationCap,
  Building2,
} from "lucide-react";

interface SAFormModalProps {
  sa?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    college?: string | null;
    program?: string | null;
    yearLevel?: string | null;
    officeId?: string | null;
    status?: string;
  } | null;
  offices: { id: string; name: string; code: string | null }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  mode?: "add" | "edit";
}

export function SAFormModal({
  sa,
  offices,
  open,
  onOpenChange,
  onSaved,
  mode = "add",
}: SAFormModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [customCollege, setCustomCollege] = useState("");
  const [program, setProgram] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [customOffice, setCustomOffice] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sa && open) {
      setFirstName(sa.firstName || "");
      setLastName(sa.lastName || "");
      setEmail(sa.email || "");
      setPhone(sa.phone || "");
      // Check if the college is in our known list
      if (sa.college && COLLEGES.find(c => c.name === sa.college || c.acronym === sa.college)) {
        setCollege(sa.college);
        setCustomCollege("");
      } else if (sa.college) {
        // It's a custom/unknown college — map to "Others" and set custom
        setCollege("Others");
        setCustomCollege(sa.college);
      } else {
        setCollege("");
        setCustomCollege("");
      }
      setProgram(sa.program || "");
      setYearLevel(sa.yearLevel || "");
      // Check if office is in known list
      if (sa.officeId && offices.find(o => o.id === sa.officeId)) {
        setOfficeId(sa.officeId);
        setCustomOffice("");
      } else {
        setOfficeId("");
        setCustomOffice("");
      }
      setStatus(sa.status || "ACTIVE");
    } else if (!sa && open) {
      // Reset form for add mode
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCollege("");
      setCustomCollege("");
      setProgram("");
      setYearLevel("");
      setOfficeId("");
      setCustomOffice("");
      setStatus("ACTIVE");
    }
  }, [sa, open, offices]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    if (mode === "add" && !email.trim()) {
      toast.error("Email is required for new student assistants");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = mode === "add" ? "/api/student-assistants" : `/api/student-assistants/${sa?.id}`;
      const method = mode === "add" ? "POST" : "PUT";

      // Resolve the final college value
      const finalCollege = college === "Others"
        ? customCollege.trim() || undefined
        : college.trim() || undefined;

      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      if (mode === "add") {
        body.email = email.trim().toLowerCase();
        body.phone = phone.trim() || undefined;
        body.college = finalCollege;
        body.program = program.trim() || undefined;
        body.yearLevel = yearLevel || undefined;
        body.officeId = officeId || undefined;
      } else {
        body.phone = phone.trim() || undefined;
        body.college = finalCollege;
        body.program = program.trim() || undefined;
        body.yearLevel = yearLevel || undefined;
        body.officeId = officeId || undefined;
        body.status = status;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save student assistant");
      }

      toast.success(
        mode === "add"
          ? "Student assistant created successfully!"
          : "Student assistant updated successfully!"
      );
      onOpenChange(false);
      onSaved?.();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save student assistant"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Student Assistant" : "Edit Student Assistant"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Section: Personal Information ────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[#1e3a8a]" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Personal Information
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dela Cruz"
                  className="rounded-lg"
                />
              </div>
            </div>

            {mode === "add" && (
              <div className="space-y-1.5">
                <Label htmlFor="saEmail">Email *</Label>
                <Input
                  id="saEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan.delacruz@umak.edu.ph"
                  className="rounded-lg"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="saPhone">Phone</Label>
              <Input
                id="saPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
                className="rounded-lg"
              />
            </div>
          </div>

          <Separator />

          {/* ── Section: Academic Information ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[#1e3a8a]" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Academic Information
              </h3>
            </div>

            <div className="space-y-1.5">
              <Label>College</Label>
              <BetterSelect
                value={college}
                onValueChange={(v) => {
                  setCollege(v);
                  if (v !== "Others") setCustomCollege("");
                }}
                placeholder="Select college"
              >
                {COLLEGES.map((c) => (
                  <SelectItem key={c.acronym} value={c.acronym}>
                    {c.name} ({c.acronym})
                  </SelectItem>
                ))}
                <SelectItem value="Others">Others</SelectItem>
              </BetterSelect>
            </div>

            {college === "Others" && (
              <div className="space-y-1.5">
                <Label htmlFor="customCollege">Custom College Name</Label>
                <Input
                  id="customCollege"
                  value={customCollege}
                  onChange={(e) => setCustomCollege(e.target.value)}
                  placeholder="Enter college or institute name"
                  className="rounded-lg"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="saProgram">Program</Label>
                <Input
                  id="saProgram"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="BS Information Technology"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Year Level</Label>
                <BetterSelect
                  value={yearLevel}
                  onValueChange={setYearLevel}
                  placeholder="Select"
                >
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                  <SelectItem value="5">5th Year</SelectItem>
                </BetterSelect>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section: Assignment ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#1e3a8a]" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Assignment
              </h3>
            </div>

            <div className="space-y-1.5">
              <Label>Office Assignment</Label>
              <BetterSelect
                value={officeId}
                onValueChange={(v) => {
                  setOfficeId(v);
                  if (v !== "Others") setCustomOffice("");
                }}
                placeholder="Select office"
              >
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
                <SelectItem value="Others">Others</SelectItem>
              </BetterSelect>
            </div>

            {officeId === "Others" && (
              <div className="space-y-1.5">
                <Label htmlFor="customOffice">Custom Office Name</Label>
                <Input
                  id="customOffice"
                  value={customOffice}
                  onChange={(e) => setCustomOffice(e.target.value)}
                  placeholder="Enter office name"
                  className="rounded-lg"
                />
              </div>
            )}

            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <BetterSelect value={status} onValueChange={setStatus}>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="RESIGNED">Resigned</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </BetterSelect>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {isSubmitting
                ? mode === "add" ? "Creating..." : "Saving..."
                : mode === "add"
                  ? "Create Student Assistant"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
