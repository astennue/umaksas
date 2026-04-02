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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
  const [program, setProgram] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sa && open) {
      setFirstName(sa.firstName || "");
      setLastName(sa.lastName || "");
      setEmail(sa.email || "");
      setPhone(sa.phone || "");
      setCollege(sa.college || "");
      setProgram(sa.program || "");
      setYearLevel(sa.yearLevel || "");
      setOfficeId(sa.officeId || "");
      setStatus(sa.status || "ACTIVE");
    } else if (!sa && open) {
      // Reset form for add mode
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCollege("");
      setProgram("");
      setYearLevel("");
      setOfficeId("");
      setStatus("ACTIVE");
    }
  }, [sa, open]);

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

      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      if (mode === "add") {
        body.email = email.trim().toLowerCase();
        body.phone = phone.trim() || undefined;
        body.college = college.trim() || undefined;
        body.program = program.trim() || undefined;
        body.yearLevel = yearLevel || undefined;
        body.officeId = officeId || undefined;
      } else {
        body.phone = phone.trim() || undefined;
        body.college = college.trim() || undefined;
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

  const collegeOptions = [
    "College of Accountancy, Business, Economics and International Hospitality Management",
    "College of Allied Health Studies",
    "College of Arts and Sciences",
    "College of Computer Studies",
    "College of Criminal Justice Education",
    "College of Education",
    "College of Engineering and Architecture",
    "College of Law and Jurisprudence",
    "College of Maritime Education",
    "College of Medicine",
    "College of Nursing",
    "College of Tourism and Hospitality Management",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Student Assistant" : "Edit Student Assistant"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
              />
            </div>
          </div>

          {mode === "add" && (
            <div>
              <Label htmlFor="saEmail">Email *</Label>
              <Input
                id="saEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan.delacruz@umak.edu.ph"
              />
            </div>
          )}

          <div>
            <Label htmlFor="saPhone">Phone</Label>
            <Input
              id="saPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 9XX XXX XXXX"
            />
          </div>

          <div>
            <Label>College</Label>
            <Select value={college} onValueChange={setCollege}>
              <SelectTrigger>
                <SelectValue placeholder="Select college" />
              </SelectTrigger>
              <SelectContent>
                {collegeOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saProgram">Program</Label>
              <Input
                id="saProgram"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="BS Information Technology"
              />
            </div>
            <div>
              <Label>Year Level</Label>
              <Select value={yearLevel} onValueChange={setYearLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                  <SelectItem value="5">5th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Office Assignment</Label>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select office" />
              </SelectTrigger>
              <SelectContent>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "edit" && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="RESIGNED">Resigned</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
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
