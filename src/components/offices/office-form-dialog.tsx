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
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, User } from "lucide-react";
import { toast } from "sonner";

export interface OfficeFormData {
  id?: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  headUserId: string;
  maxSACount: number;
  isActive?: boolean;
}

interface HeadUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
}

interface OfficeFormDialogProps {
  office?: OfficeFormData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const emptyForm: OfficeFormData = {
  name: "",
  code: "",
  email: "",
  phone: "",
  location: "",
  description: "",
  headUserId: "",
  maxSACount: 5,
};

export function OfficeFormDialog({ office, open, onOpenChange, onSaved }: OfficeFormDialogProps) {
  const [form, setForm] = useState<OfficeFormData>(emptyForm);
  const [headUsers, setHeadUsers] = useState<HeadUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const isEditing = !!office?.id;

  useEffect(() => {
    if (open) {
      if (office) {
        setForm({ ...emptyForm, ...office });
      } else {
        setForm({ ...emptyForm });
      }
      fetchHeadUsers();
    }
  }, [open, office]);

  async function fetchHeadUsers() {
    try {
      setLoadingUsers(true);
      // Fetch users that can be office heads (SUPER_ADMIN, ADVISER, OFFICE_SUPERVISOR, HRMO)
      const res = await fetch("/api/offices?limit=100");
      if (!res.ok) return;
      // We need a separate endpoint for head users - use a simple approach
      // Fetch from a broader endpoint
      const officesData = await res.json();
      // For now, just use the head users from offices as reference
      // We'll add a dedicated endpoint for listing potential heads
      const res2 = await fetch("/api/student-assistants?limit=1");
      if (!res2.ok) return;
      // We'll use a small list - in production you'd have a users endpoint
      setHeadUsers([]);
    } catch {
      setHeadUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  const handleChange = (field: keyof OfficeFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Office name is required");
      return;
    }

    try {
      setLoading(true);

      const url = isEditing ? `/api/offices/${office!.id}` : "/api/offices";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code || null,
          email: form.email || null,
          phone: form.phone || null,
          location: form.location || null,
          description: form.description || null,
          headUserId: form.headUserId || null,
          maxSACount: form.maxSACount,
          ...(isEditing && { isActive: form.isActive }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save office");
      }

      toast.success(isEditing ? "Office updated" : "Office created");
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save office");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? "Edit Office" : "Add New Office"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="office-name">Office Name *</Label>
            <Input
              id="office-name"
              placeholder="e.g., Office of the Registrar"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="office-code">Office Code</Label>
            <Input
              id="office-code"
              placeholder="e.g., OTR"
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="office-email">Email</Label>
              <Input
                id="office-email"
                type="email"
                placeholder="office@umak.edu.ph"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office-phone">Phone</Label>
              <Input
                id="office-phone"
                placeholder="+63 xxx xxx xxxx"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="office-location">Location</Label>
            <Input
              id="office-location"
              placeholder="e.g., Main Building, 2nd Floor"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="office-description">Description</Label>
            <Textarea
              id="office-description"
              placeholder="Brief description of the office..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {/* Head Assignment */}
          <div className="space-y-2">
            <Label>Office Head</Label>
            <Select
              value={form.headUserId}
              onValueChange={(v) => handleChange("headUserId", v)}
            >
              <SelectTrigger>
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select head user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No head assigned</SelectItem>
                {headUsers.length === 0 && !loadingUsers && (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    Type the head name in the field below
                  </div>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a user to assign as the office head supervisor.
            </p>
          </div>

          {/* Max SA Count */}
          <div className="space-y-2">
            <Label htmlFor="office-max-sa">Max SA Count</Label>
            <Input
              id="office-max-sa"
              type="number"
              min={1}
              max={50}
              value={form.maxSACount}
              onChange={(e) => handleChange("maxSACount", parseInt(e.target.value) || 5)}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of student assistants this office can have.
            </p>
          </div>

          {/* Active toggle (edit only) */}
          {isEditing && (
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <span className="text-sm">Status:</span>
              <Badge
                variant="secondary"
                className={
                  form.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }
              >
                {form.isActive ? "Active" : "Archived"}
              </Badge>
            </div>
          )}

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
              disabled={loading || !form.name.trim()}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Office" : "Create Office"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
