"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduleInterviewDialogProps {
  applicationId: string;
  applicantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

export function ScheduleInterviewDialog({
  applicationId,
  applicantName,
  open,
  onOpenChange,
  onScheduled,
}: ScheduleInterviewDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    if (!time) {
      toast.error("Please enter a time");
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parseInt(time.split(":")[0]),
        parseInt(time.split(":")[1] || "0"),
        0
      );

      const res = await fetch(`/api/applications/${applicationId}/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          duration: parseInt(duration) || 30,
          meetingLink: meetingLink || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule interview");
      }

      toast.success("Interview scheduled successfully!");
      onOpenChange(false);
      onScheduled?.();
      // Reset form
      setDate(undefined);
      setTime("10:00");
      setDuration("30");
      setMeetingLink("");
      setNotes("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule interview");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-xs text-muted-foreground">Applicant</p>
            <p className="text-sm font-medium">{applicantName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="15"
              max="120"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="meetingLink">Meeting Link (optional)</Label>
            <Input
              id="meetingLink"
              type="url"
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="interviewNotes">Notes (optional)</Label>
            <Textarea
              id="interviewNotes"
              placeholder="Additional notes for the interviewer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !date}
              className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {isSubmitting ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
