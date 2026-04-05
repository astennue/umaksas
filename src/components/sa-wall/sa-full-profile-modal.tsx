"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Building2,
  GraduationCap,
  BookOpen,
  Mail,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SACardData } from "./sa-card";
import { getCollegeDisplay } from "@/lib/colleges";

interface SAFullProfileModalProps {
  sa: SACardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(firstName: string, lastName: string): string {
  const f = firstName?.charAt(0)?.toUpperCase() || "";
  const l = lastName?.charAt(0)?.toUpperCase() || "";
  return `${f}${l}`;
}

export function SAFullProfileModal({ sa, open, onOpenChange }: SAFullProfileModalProps) {
  if (!sa) return null;

  const initials = getInitials(sa.firstName, sa.lastName);
  const fullName = `${sa.firstName} ${sa.lastName}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="max-h-[85vh] overflow-y-auto"
            >
              <DialogHeader className="sr-only">
                <DialogTitle>{fullName} - Profile</DialogTitle>
                <DialogDescription>Profile information for {fullName}</DialogDescription>
              </DialogHeader>

              {/* Header with gradient */}
              <div className="relative bg-gradient-to-br from-[#0f1b4d] to-[#0d2247] px-6 pt-8 pb-10 text-center">
                {/* Decorative circles */}
                <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-yellow-500/10 blur-xl" />
                <div className="absolute bottom-2 left-4 w-16 h-16 rounded-full bg-blue-500/10 blur-xl" />

                {/* Avatar */}
                <div className="flex justify-center mb-3 relative z-10">
                  <div className="relative">
                    <div className="h-[120px] w-[120px] rounded-full overflow-hidden border-3 border-white/30 flex items-center justify-center shadow-lg">
                      {sa.photoUrl ? (
                        <img
                          src={sa.photoUrl}
                          alt={fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white font-bold text-3xl">
                          {initials}
                        </div>
                      )}
                    </div>
                    {/* On duty indicator */}
                    {sa.isOnDuty && (
                      <span className="absolute bottom-2 right-2 z-10">
                        <span className="relative flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-white" />
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Name */}
                <h2 className="text-xl font-bold text-white relative z-10 break-words max-w-[280px] mx-auto">
                  {fullName}
                </h2>

                {/* UMAK SAS Officer badge */}
                {sa.isOfficer && sa.officerPosition && (
                  <div className="flex justify-center mt-2 relative z-10">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-xs font-medium px-3 py-1">
                      <Award className="w-3 h-3 mr-1" />
                      UMAK SAS Officer — {sa.officerPosition.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}

                {/* Status badge */}
                <div className="flex justify-center mt-3 relative z-10">
                  {sa.isOnDuty ? (
                    <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs font-medium px-3 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                      On Duty
                    </Badge>
                  ) : (
                    <Badge className="bg-white/10 text-blue-200 border-white/20 text-xs font-medium px-3 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5" />
                      Off Duty
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content - only the key info */}
              <div className="px-6 pb-6">
                <Separator className="-mx-6" />
                <div className="mt-5 space-y-3.5">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Profile Information
                  </h3>

                  {/* College */}
                  {sa.college ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">College</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {getCollegeDisplay(sa.college, 'both')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Program */}
                  {sa.program ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Program</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {sa.program}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Office Assigned */}
                  {sa.officeName ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Office Assigned</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {sa.officeName}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Office Email */}
                  {sa.officeEmail ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-green-600 dark:text-green-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Office Email</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {sa.officeEmail}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* UMAK Email */}
                  {sa.umakEmail ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">UMAK Email</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {sa.umakEmail}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Show message if no data available */}
                  {!sa.college && !sa.program && !sa.officeName && !sa.officeEmail && !sa.umakEmail && (
                    <div className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">
                      No profile information available yet.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
