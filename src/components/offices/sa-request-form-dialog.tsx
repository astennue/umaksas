"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export interface SARequestFormData {
  officeId: string;
  requestedCount: number;
  reason: string;
  requirements: string;
  preferredSkills: string;
}

interface Office {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

interface SARequestFormDialogProps {
  preselectedOfficeId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const emptyForm: SARequestFormData = {
  officeId: "",
  requestedCount: 1,
  reason: "",
  requirements: "",
  preferredSkills: "",
};

export function SARequestFormDialog({
  preselectedOfficeId,
  open,
  onOpenChange,
  onSaved,
}: SARequestFormDialogProps) {
  const [form, setForm] = useState<SARequestFormData>(emptyForm);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOffices, setLoadingOffices] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        ...emptyForm,
        officeId: preselectedOfficeId || "",
      });
      fetchOffices();
    }
  }, [open, preselectedOfficeId]);

  async function fetchOffices() {
    try {
      setLoadingOffices(true);
      const res = await fetch("/api/offices?limit=200");
      if (!res.ok) return;
      const data = await res.json();
      setOffices(
        (data.offices || [])
          .filter((o: Office) => o.isActive)
          .sort((a: Office, b: Office) => a.name.localeCompare(b.name))
      );
    } catch {
      setOffices([]);
    } finally {
      setLoadingOffices(false);
    }
  }

  const handleChange = (field: keyof SARequestFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.officeId) {
      toast.error("Please select an office");
      return;
    }
    if (!form.requestedCount || form.requestedCount < 1) {
      toast.error("Requested count must be at least 1");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/offices/${form.officeId}/sa-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedCount: form.requestedCount,
          reason: form.reason || null,
          requirements: form.requirements || null,
          preferredSkills: form.preferredSkills || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create SA request");
      }

      toast.success("SA request created successfully");
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create SA request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            New SA Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Office Select */}
          <div className="space-y-2">
            <Label>Office *</Label>
            <Select
              value={form.officeId}
              onValueChange={(v) => handleChange("officeId", v)}
              disabled={!!preselectedOfficeId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingOffices ? "Loading offices..." : "Select an office"}
                />
              </SelectTrigger>
              <SelectContent>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                    {office.code ? ` (${office.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requested Count */}
          <div className="space-y-2">
            <Label htmlFor="request-count">Number of SAs Requested *</Label>
            <Input
              id="request-count"
              type="number"
              min={1}
              max={20}
              value={form.requestedCount}
              onChange={(e) =>
                handleChange("requestedCount", parseInt(e.target.value) || 1)
              }
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="request-reason">Reason</Label>
            <Textarea
              id="request-reason"
              placeholder="Explain why this office needs additional student assistants..."
              value={form.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
              rows={3}
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label htmlFor="request-requirements">Requirements</Label>
            <Textarea
              id="request-requirements"
              placeholder="List any specific requirements for the SAs..."
              value={form.requirements}
              onChange={(e) => handleChange("requirements", e.target.value)}
              rows={2}
            />
          </div>

          {/* Preferred Skills */}
          <div className="space-y-2">
            <Label htmlFor="request-skills">Preferred Skills</Label>
            <Textarea
              id="request-skills"
              placeholder="e.g., Microsoft Office, customer service, data entry..."
              value={form.preferredSkills}
              onChange={(e) => handleChange("preferredSkills", e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.officeId || !form.requestedCount}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
