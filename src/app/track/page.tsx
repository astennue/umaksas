"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Calendar,
  User,
  FileText,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PublicLayout } from "@/components/public/public-layout";

interface TimelineItem {
  status: string;
  label: string;
  description: string;
  completed: boolean;
  date: string | null;
}

interface ApplicationData {
  id: string;
  applicantEmail: string;
  firstName: string;
  lastName: string;
  status: string;
  currentStep: number;
  submittedAt: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
  interviewStatus: string;
  interviewDate: string;
  timeline: TimelineItem[];
}

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  DRAFT: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", icon: FileText },
  SUBMITTED: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", icon: Mail },
  UNDER_REVIEW: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", icon: Search },
  INTERVIEW_SCHEDULED: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", icon: Calendar },
  INTERVIEWED: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", icon: User },
  APPROVED: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", icon: CheckCircle2 },
  REJECTED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", icon: XCircle },
  WITHDRAWN: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500", icon: XCircle },
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEWED: "Interviewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <PublicLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        </PublicLayout>
      }
    >
      <TrackPageContent />
    </Suspense>
  );
}

function TrackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Check for email in URL params on mount
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      fetchApplication(emailParam);
    }
    setInitialLoad(false);
  }, []);

  const fetchApplication = useCallback(async (emailToFetch: string) => {
    if (!emailToFetch.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setNotFound(false);
    setApplication(null);

    try {
      const res = await fetch(`/api/applications/track/${encodeURIComponent(emailToFetch.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setApplication(data);
      } else if (res.status === 404) {
        setNotFound(true);
      } else {
        toast.error("Failed to fetch application status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplication(email);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Pending";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <Badge className="mb-3 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50">
            <Search className="mr-1 h-3.5 w-3.5" />
            Application Tracker
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Track Your Application
          </h1>
          <p className="mt-2 text-muted-foreground">
            Enter the email you used in your application to check its status.
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glow-border mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Track
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm text-muted-foreground">Looking up your application...</p>
          </div>
        )}

        {/* Not Found */}
        {!isLoading && notFound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Application Not Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  No application was found with this email address. Please make sure you&apos;re using
                  the same email you submitted your application with.
                </p>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <Button
                    onClick={() => router.push("/apply")}
                    className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                  >
                    Apply Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => { setNotFound(false); setApplication(null); }}>
                    Try Different Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Application Status */}
        {!isLoading && application && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#1a1147] to-[#0d1b3e] px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {application.firstName} {application.lastName}
                    </CardTitle>
                    <p className="text-sm text-blue-200">{application.applicantEmail}</p>
                  </div>
                  <Badge
                    className={`${statusColors[application.status]?.bg || "bg-gray-100"} ${
                      statusColors[application.status]?.text || "text-gray-700"
                    } border-0 px-3 py-1`}
                  >
                    {statusLabels[application.status] || application.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date Submitted</p>
                      <p className="text-sm font-medium">{formatDate(application.submittedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-medium">{formatDate(application.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Application ID</p>
                      <p className="font-mono text-sm font-medium">{application.id.slice(0, 12)}...</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Current Progress</p>
                      <p className="text-sm font-medium">Step {application.currentStep} of 10</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Progress</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-0">
                  {application.timeline.map((item, index) => {
                    const isLast = index === application.timeline.length - 1;
                    const StatusIcon = statusColors[item.status]?.icon || Clock;
                    const isActive = !item.completed && (index === 0 || application.timeline[index - 1]?.completed);

                    return (
                      <div key={item.status} className="flex gap-4">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              item.completed
                                ? "border-green-500 bg-green-500 text-white"
                                : isActive
                                ? "border-violet-600 bg-violet-600 text-white animate-pulse"
                                : "border-muted-foreground/30 bg-background text-muted-foreground/50"
                            }`}
                          >
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          {!isLast && (
                            <div
                              className={`w-0.5 flex-1 min-h-[2rem] ${
                                item.completed
                                  ? "bg-green-500"
                                  : "bg-muted-foreground/20"
                              }`}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
                          <h4
                            className={`text-sm font-semibold ${
                              item.completed
                                ? "text-green-700 dark:text-green-400"
                                : isActive
                                ? "text-violet-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.label}
                          </h4>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                          {item.date && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(item.date)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Draft notice */}
            {application.status === "DRAFT" && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Application Not Yet Submitted
                    </h4>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                      Your application is saved as a draft. Complete and submit it to begin the review process.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => router.push("/apply")}
                      className="mt-2 gap-2 bg-violet-600 text-white hover:bg-violet-700"
                    >
                      Continue Application
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approved notice */}
            {application.status === "APPROVED" && (
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                <CardContent className="flex items-start gap-3 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
                      Congratulations! You&apos;ve Been Approved!
                    </h4>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                      Your application has been approved. An account has been created for you. Please check your email for your login credentials.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Empty state (no initial load) */}
        {!isLoading && !notFound && !application && !initialLoad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Search className="h-8 w-8 text-violet-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Check Your Application Status</h3>
            <p className="text-sm text-muted-foreground">
              Enter your email address above to see the current status of your SA application.
            </p>
          </motion.div>
        )}
      </div>
    </PublicLayout>
  );
}
