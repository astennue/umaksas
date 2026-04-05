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
import { Button } from "@/components/ui/button";
import {
  User,
  Building2,
  GraduationCap,
  Calendar,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SACardData } from "./sa-card";
import { getCollegeDisplay } from "@/lib/colleges";

interface SADetailModalProps {
  sa: SACardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated?: boolean;
  onViewFullProfile?: (sa: SACardData) => void;
}

function getInitials(firstName: string, lastName: string): string {
  const f = firstName?.charAt(0)?.toUpperCase() || "";
  const l = lastName?.charAt(0)?.toUpperCase() || "";
  return `${f}${l}`;
}

export function SADetailModal({
  sa,
  open,
  onOpenChange,
  isAuthenticated,
  onViewFullProfile,
}: SADetailModalProps) {
  if (!sa) return null;

  const initials = getInitials(sa.firstName, sa.lastName);
  const fullName = `${sa.firstName} ${sa.lastName}`.trim();
  const hasDetails = !!(sa.program || sa.academicYear || sa.semester);

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
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-br from-[#0f1b4d] to-[#0d2247] px-6 pt-8 pb-10 text-center">
                {/* Decorative circles */}
                <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-yellow-500/10 blur-xl" />
                <div className="absolute bottom-2 left-4 w-16 h-16 rounded-full bg-blue-500/10 blur-xl" />

                <DialogHeader className="relative z-10">
                  <DialogTitle className="sr-only">
                    {fullName} - Student Assistant Details
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detailed information about {fullName}
                  </DialogDescription>
                </DialogHeader>

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
                <h2 className="text-xl font-bold text-white relative z-10 break-words max-w-[280px]">
                  {fullName}
                </h2>

                {/* Office */}
                {sa.officeName && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-blue-200 text-sm relative z-10 min-w-0 max-w-[280px]">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sa.officeName}</span>
                  </div>
                )}

                {/* College */}
                {sa.college && (
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-blue-300/80 text-sm relative z-10 min-w-0 max-w-[280px]">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{getCollegeDisplay(sa.college, 'both')}</span>
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

              {/* Content */}
              <div className="px-6 pb-6">
                {hasDetails && (
                  <>
                    <Separator className="-mx-6" />
                    <div className="mt-5 space-y-3.5">
                      <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Details
                      </h3>

                      {/* Program */}
                      {sa.program && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-400 dark:text-gray-500">Program</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                              {sa.program}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Academic Year + Semester */}
                      {(sa.academicYear || sa.semester) && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-400 dark:text-gray-500">AY / Semester</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                              {[sa.academicYear, sa.semester].filter(Boolean).join(" | ") || "N/A"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* View Full Profile button (authenticated only) */}
                {isAuthenticated === true && (
                  <div className={hasDetails ? "mt-5" : "mt-2"}>
                    <Button
                      className="w-full bg-blue-900 hover:bg-blue-800 text-white h-10 gap-2"
                      onClick={() => {
                        onOpenChange(false);
                        onViewFullProfile?.(sa);
                      }}
                    >
                      <User className="w-4 h-4" />
                      View Full Profile
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
