import {
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Bell,
  CalendarClock,
  ClipboardCheck,
  Star,
  DollarSign,
  CheckCheck,
  CalendarPlus,
  Clock,
  CalendarCheck,
  UserPlus,
  Info,
  type LucideIcon,
} from "lucide-react";

export type NotificationType =
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_REMINDER"
  | "INTERVIEW_RESCHEDULE_REQUESTED"
  | "EVALUATION_DUE"
  | "EVALUATION_SUBMITTED"
  | "PAYMENT_DUE"
  | "PAYMENT_VERIFIED"
  | "EVENT_ASSIGNED"
  | "EVENT_REMINDER"
  | "SCHEDULE_APPROVED"
  | "ATTENDANCE_CORRECTED"
  | "ACCOUNT_CREATED"
  | "SYSTEM";

const notificationIconMap: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  APPLICATION_SUBMITTED: { icon: FileText, color: "text-blue-500" },
  APPLICATION_APPROVED: { icon: CheckCircle, color: "text-emerald-500" },
  APPLICATION_REJECTED: { icon: XCircle, color: "text-red-500" },
  INTERVIEW_SCHEDULED: { icon: Calendar, color: "text-violet-500" },
  INTERVIEW_REMINDER: { icon: Bell, color: "text-amber-500" },
  INTERVIEW_RESCHEDULE_REQUESTED: { icon: CalendarClock, color: "text-orange-500" },
  EVALUATION_DUE: { icon: ClipboardCheck, color: "text-rose-500" },
  EVALUATION_SUBMITTED: { icon: Star, color: "text-yellow-500" },
  PAYMENT_DUE: { icon: DollarSign, color: "text-emerald-600" },
  PAYMENT_VERIFIED: { icon: CheckCheck, color: "text-green-500" },
  EVENT_ASSIGNED: { icon: CalendarPlus, color: "text-indigo-500" },
  EVENT_REMINDER: { icon: Clock, color: "text-cyan-500" },
  SCHEDULE_APPROVED: { icon: CalendarCheck, color: "text-teal-500" },
  ATTENDANCE_CORRECTED: { icon: Clock, color: "text-sky-500" },
  ACCOUNT_CREATED: { icon: UserPlus, color: "text-blue-500" },
  SYSTEM: { icon: Info, color: "text-slate-500" },
};

export function getNotificationIcon(type: NotificationType) {
  return notificationIconMap[type] || { icon: Bell, color: "text-muted-foreground" };
}

export const notificationTypeLabels: Record<NotificationType, string> = {
  APPLICATION_SUBMITTED: "Application Submitted",
  APPLICATION_APPROVED: "Application Approved",
  APPLICATION_REJECTED: "Application Rejected",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_REMINDER: "Interview Reminder",
  INTERVIEW_RESCHEDULE_REQUESTED: "Reschedule Requested",
  EVALUATION_DUE: "Evaluation Due",
  EVALUATION_SUBMITTED: "Evaluation Submitted",
  PAYMENT_DUE: "Payment Due",
  PAYMENT_VERIFIED: "Payment Verified",
  EVENT_ASSIGNED: "Event Assigned",
  EVENT_REMINDER: "Event Reminder",
  SCHEDULE_APPROVED: "Schedule Approved",
  ATTENDANCE_CORRECTED: "Attendance Corrected",
  ACCOUNT_CREATED: "Account Created",
  SYSTEM: "System",
};
