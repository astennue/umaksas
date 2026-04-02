"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Video,
  User,
} from "lucide-react";
import { format } from "date-fns";

export interface InterviewData {
  id: string;
  scheduledAt: string;
  duration: number;
  meetingLink: string | null;
  location: string | null;
  status: string;
  score: number | null;
  notes: string | null;
  interviewer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  interviewee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  application: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    applicantEmail: string;
    college: string | null;
    program: string | null;
    status: string;
    interviewStatus: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  COMPLETED: { label: "Completed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  RESCHEDULE_REQUESTED: { label: "Reschedule Requested", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  NO_SHOW: { label: "No Show", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

interface InterviewCardProps {
  interview: InterviewData;
  onClick?: (interview: InterviewData) => void;
}

export function InterviewCard({ interview, onClick }: InterviewCardProps) {
  const config = statusConfig[interview.status] || statusConfig.SCHEDULED;
  const applicantName = interview.application.firstName
    ? `${interview.application.firstName} ${interview.application.lastName || ""}`.trim()
    : interview.application.applicantEmail;

  const scheduledDate = new Date(interview.scheduledAt);
  const isPast = scheduledDate < new Date();

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      onClick={() => onClick?.(interview)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="text-sm font-semibold truncate">{applicantName}</h3>
            </div>
            {interview.application.college && (
              <p className="text-xs text-muted-foreground mb-3 truncate">
                {interview.application.college}
                {interview.application.program ? ` • ${interview.application.program}` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(scheduledDate, "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{format(scheduledDate, "h:mm a")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{interview.duration} min</span>
              </div>
            </div>
          </div>
          <Badge className={config.color} variant="secondary">
            {config.label}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          {interview.meetingLink && (
            <a
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              <Video className="h-3 w-3" />
              Join Meeting
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {interview.score !== null && (
            <span className="text-xs font-medium text-amber-600">
              Score: {interview.score}/100
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
