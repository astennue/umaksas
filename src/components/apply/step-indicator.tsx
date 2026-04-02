"use client";

import {
  User,
  Phone,
  Users,
  GraduationCap,
  School,
  Briefcase,
  Award,
  UserCheck,
  FileUp,
  CheckCircle,
  Check,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STEPS } from "@/lib/validations/application";

interface StepIndicatorProps {
  currentStep: number; // 1-indexed
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const iconMap: Record<string, typeof User> = {
  User,
  Phone,
  Users,
  GraduationCap,
  School,
  Briefcase,
  Award,
  UserCheck,
  FileUp,
  CalendarDays,
  CalendarClock,
  CheckCircle,
};

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const maxReached = completedSteps.length > 0
    ? Math.max(...completedSteps, currentStep)
    : currentStep;

  return (
    <div className="w-full">
      {/* Desktop version — grid-based uniform layout */}
      <div className="hidden lg:block">
        {/* Icons row with uniform grid */}
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
            gap: "0",
          }}
        >
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isClickable = isCompleted || step.id <= maxReached + 1;

            const IconComponent = iconMap[step.icon] || User;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-1.5 transition-all shrink-0",
                    isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                          ? "border-blue-700 bg-blue-700 text-white shadow-lg shadow-blue-700/30"
                          : "border-muted-foreground/30 bg-background text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold whitespace-nowrap leading-tight",
                      isCurrent
                        ? "text-blue-700 dark:text-yellow-500"
                        : isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </button>

                {/* Connector line — fills remaining space uniformly */}
                {index < STEPS.length - 1 && (
                  <div className="flex-1 mx-0.5 h-0.5 -mt-5 self-start mt-[18px]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        completedSteps.includes(step.id + 1) || isCompleted
                          ? "bg-emerald-500"
                          : currentStep > step.id
                            ? "bg-blue-700/50"
                            : "bg-muted-foreground/20"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile version */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isClickable = isCompleted || step.id <= maxReached + 1;

            const IconComponent = iconMap[step.icon] || User;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : isCurrent
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-yellow-500"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <IconComponent className="h-3.5 w-3.5" />
                  )}
                  {step.shortTitle}
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-0.5 h-0.5 w-3 rounded-full",
                      isCompleted
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-700 transition-all duration-500 dark:bg-yellow-500"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1]?.title}
        </p>
      </div>
    </div>
  );
}
