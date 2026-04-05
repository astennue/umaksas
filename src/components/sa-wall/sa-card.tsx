"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  GraduationCap,
  CalendarDays,
  BookOpen,
  User,
  Award,
} from "lucide-react";
import { OnDutyIndicator } from "./on-duty-indicator";
import { getCollegeDisplay } from "@/lib/colleges";
import { cn } from "@/lib/utils";

export interface SACardData {
  id: string;
  firstName: string;
  lastName: string;
  college: string | null;
  officeName: string | null;
  officeEmail: string | null;
  isOnDuty: boolean;
  lastClockIn: string | null;
  academicYear?: string | null;
  semester?: string | null;
  studentNumber?: string | null;
  dateHired?: string | null;
  totalHoursWorked?: number;
  hoursThisSemester?: number;
  yearLevel?: string | null;
  program?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  sex?: string | null;
  courtesyTitle?: string | null;
  contactNumber?: string | null;
  personalEmail?: string | null;
  umakEmail?: string | null;
  photoUrl?: string | null;
  isOfficer?: boolean;
  officerPosition?: string | null;
}

interface SACardProps {
  sa: SACardData;
  index: number;
  onClick?: () => void;
  isAuthenticated?: boolean;
  onViewFullProfile?: (saId: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
  const f = firstName?.charAt(0)?.toUpperCase() || "";
  const l = lastName?.charAt(0)?.toUpperCase() || "";
  return `${f}${l}`;
}

export function SACard({ sa, onClick, isAuthenticated, onViewFullProfile }: SACardProps) {
  const initials = getInitials(sa.firstName, sa.lastName);
  const fullName = `${sa.firstName} ${sa.lastName}`.trim();

  return (
    <Card
      className="group relative overflow-hidden rounded-xl border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Gradient accent bar */}
      <div
        className={`h-1.5 ${
          sa.isOnDuty
            ? "bg-gradient-to-r from-green-400 to-emerald-500"
            : "bg-gradient-to-r from-blue-700 via-blue-600 to-yellow-500"
        }`}
      />

      <CardContent className="p-5 pt-6">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            {sa.photoUrl ? (
              <img
                src={sa.photoUrl}
                alt={fullName}
                className="h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-blue-100 dark:ring-blue-900/50 group-hover:ring-yellow-200 dark:group-hover:ring-yellow-800/50 transition-all duration-300"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-white font-bold text-xl shadow-md ring-4 ring-blue-100 dark:ring-blue-900/50 group-hover:ring-yellow-200 dark:group-hover:ring-yellow-800/50 transition-all duration-300">
                {initials}
              </div>
            )}
            <OnDutyIndicator isOnDuty={sa.isOnDuty} />
          </div>

          {/* Name */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition-colors duration-300 truncate max-w-[220px]">
            {fullName}
          </h3>

          {/* UMAK SAS Officer badge */}
          {sa.isOfficer && sa.officerPosition && (
            <div className="mt-1.5">
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-400/30"
              >
                <Award className="w-3 h-3 mr-1" />
                UMAK SAS Officer — {sa.officerPosition.replace(/_/g, " ")}
              </Badge>
            </div>
          )}

          {/* College */}
          {sa.college && (
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-700 dark:text-gray-300">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{getCollegeDisplay(sa.college, 'acronym')}</span>
            </div>
          )}

          {/* Program */}
          {sa.program && (
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="truncate max-w-[200px] inline-block">{sa.program}</span>
            </div>
          )}

          {/* Office */}
          {sa.officeName && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <Building2 className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{sa.officeName}</span>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-100 dark:border-gray-700/50 my-4" />

        {/* Badges row: Duty Status + Academic Year + Semester */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {/* Duty status badge - always shown */}
          <Badge
            variant="secondary"
            className={cn(
              "text-xs font-medium px-3 py-1",
              sa.isOnDuty
                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            )}
          >
            <span className={cn(
              "w-1.5 h-1.5 rounded-full mr-1.5",
              sa.isOnDuty ? "bg-green-500 animate-pulse" : "bg-slate-400"
            )} />
            {sa.isOnDuty ? "On Duty" : "Off Duty"}
          </Badge>
          {sa.academicYear && (
            <Badge
              variant="secondary"
              className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-800/50"
            >
              <CalendarDays className="w-3 h-3 mr-1" />
              {sa.academicYear}
            </Badge>
          )}
          {sa.semester && (
            <Badge
              variant="secondary"
              className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium border border-yellow-100 dark:border-yellow-800/50"
            >
              <BookOpen className="w-3 h-3 mr-1" />
              {sa.semester}
            </Badge>
          )}
        </div>

        {/* View Full Profile button (authenticated only) */}
        {isAuthenticated && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onViewFullProfile?.(sa.id);
              }}
            >
              <User className="h-3.5 w-3.5" />
              View Full Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
