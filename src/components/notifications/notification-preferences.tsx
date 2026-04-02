"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreferenceCategory {
  name: string;
  description: string;
  fields: { key: string; label: string }[];
}

const preferenceCategories: PreferenceCategory[] = [
  {
    name: "Application",
    description: "Notifications about your applications",
    fields: [
      { key: "applicationSubmitted", label: "Application Submitted" },
      { key: "applicationApproved", label: "Application Approved" },
      { key: "applicationRejected", label: "Application Rejected" },
    ],
  },
  {
    name: "Interview",
    description: "Interview scheduling and reminders",
    fields: [
      { key: "interviewScheduled", label: "Interview Scheduled" },
      { key: "interviewReminder", label: "Interview Reminders" },
    ],
  },
  {
    name: "Evaluation",
    description: "Evaluation updates and deadlines",
    fields: [
      { key: "evaluationDue", label: "Evaluation Due" },
      { key: "evaluationSubmitted", label: "Evaluation Submitted" },
    ],
  },
  {
    name: "Payment",
    description: "Payment status and reminders",
    fields: [
      { key: "paymentDue", label: "Payment Due" },
      { key: "paymentVerified", label: "Payment Verified" },
    ],
  },
  {
    name: "Events & Schedule",
    description: "Event assignments and schedule changes",
    fields: [
      { key: "eventAssigned", label: "Event Assigned" },
      { key: "eventReminder", label: "Event Reminders" },
      { key: "scheduleApproved", label: "Schedule Approved" },
      { key: "attendanceCorrected", label: "Attendance Corrected" },
    ],
  },
  {
    name: "System",
    description: "Account and system notifications",
    fields: [
      { key: "accountCreated", label: "Account Created" },
      { key: "system", label: "System Announcements" },
    ],
  },
];

export function NotificationPreferences({
  open,
  onOpenChange,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || {});
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPreferences();
    }
  }, [open, fetchPreferences]);

  const togglePreference = (key: string, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (res.ok) {
        onOpenChange(false);
      }
    } catch {
      // silently fail
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </SheetTitle>
          <SheetDescription>
            Choose which notifications you want to receive.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            preferenceCategories.map((category, idx) => (
              <div key={category.name}>
                <div className="mb-3">
                  <h4 className="text-sm font-semibold">{category.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <div className="space-y-3">
                  {category.fields.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <Label
                        htmlFor={`pref-${field.key}`}
                        className="text-sm cursor-pointer"
                      >
                        {field.label}
                      </Label>
                      <Switch
                        id={`pref-${field.key}`}
                        checked={preferences[field.key] ?? true}
                        onCheckedChange={(checked) =>
                          togglePreference(field.key, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
                {idx < preferenceCategories.length - 1 && (
                  <Separator className="mt-6" />
                )}
              </div>
            ))
          )}

          <div className="sticky bottom-0 bg-background pt-4 pb-2">
            <Button
              className="w-full"
              onClick={savePreferences}
              disabled={isSaving || isLoading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
