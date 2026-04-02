"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  User,
  CheckCircle,
  XCircle,
  RotateCcw,
  Star,
  Mail,
  GraduationCap,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { InterviewData } from "./interview-card";

const statusConfig: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  COMPLETED: { label: "Completed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  RESCHEDULE_REQUESTED: { label: "Reschedule Requested", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  NO_SHOW: { label: "No Show", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

interface InterviewDetailModalProps {
  interview: InterviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function InterviewDetailModal({
  interview,
  open,
  onOpenChange,
  onUpdated,
}: InterviewDetailModalProps) {
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!interview) return null;

  const config = statusConfig[interview.status] || statusConfig.SCHEDULED;
  const applicantName = interview.application.firstName
    ? `${interview.application.firstName} ${interview.application.lastName || ""}`.trim()
    : interview.application.applicantEmail;

  const scheduledDate = new Date(interview.scheduledAt);
  const isCompleted = interview.status === "COMPLETED";
  const isPending = interview.status === "SCHEDULED" || interview.status === "ACCEPTED";

  const handleComplete = async () => {
    const scoreValue = parseFloat(score);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      toast.error("Please enter a valid score between 0 and 100");
      return;
    }

    setIsCompleting(true);
    try {
      const res = await fetch(`/api/interviews/${interview.id}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: scoreValue, notes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete interview");
      }

      toast.success("Interview completed successfully!");
      onOpenChange(false);
      onUpdated?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to complete interview");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/interviews/${interview.id}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel interview");
      }

      toast.success("Interview cancelled");
      onOpenChange(false);
      onUpdated?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel interview");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Interview Details</DialogTitle>
            <Badge className={config.color} variant="secondary">
              {config.label}
            </Badge>
          </div>
        </DialogHeader>

        {/* Applicant Info */}
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Applicant Information</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{applicantName}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">{interview.application.applicantEmail}</span>
            </div>
            {interview.application.college && (
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">{interview.application.college}</span>
              </div>
            )}
            {interview.application.program && (
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">{interview.application.program}</span>
              </div>
            )}
          </div>
        </div>

        {/* Interview Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">Interview Schedule</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{format(scheduledDate, "MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{format(scheduledDate, "h:mm a")} • {interview.duration} min</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{interview.interviewer.firstName} {interview.interviewer.lastName}</span>
            </div>
          </div>

          {interview.meetingLink && (
            <a
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <Video className="h-4 w-4" />
              <span className="flex-1 truncate">{interview.meetingLink}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {interview.notes && (
            <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm break-words">{interview.notes}</p>
            </div>
          )}

          {interview.score !== null && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Interview Score: {interview.score}/100</span>
            </div>
          )}
        </div>

        {/* Reschedule info */}
        {interview.status === "RESCHEDULE_REQUESTED" && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
            <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
              Reschedule Requested
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
              The applicant has requested to reschedule this interview.
            </p>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Complete Interview</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="score">Score (0-100)</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Enter interview score"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Interview Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about the interview..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleComplete}
                  disabled={isCompleting || !score}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isCompleting ? "Completing..." : "Complete Interview"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </Button>
              </div>
            </div>
          </>
        )}

        {isCompleted && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Interview Completed</p>
                {interview.score !== null && (
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Final Score: {interview.score}/100
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
