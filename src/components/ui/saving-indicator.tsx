"use client"

import * as React from "react"
import { Check, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SavingIndicatorProps {
  saving?: boolean
  lastSaved?: Date | null
  dirty?: boolean
  className?: string
}

function SavingIndicator({
  saving = false,
  lastSaved = null,
  dirty = false,
  className,
}: SavingIndicatorProps) {
  // Determine current display state with priority:
  // saving > dirty > saved
  const state = saving
    ? ("saving" as const)
    : dirty
      ? ("dirty" as const)
      : lastSaved
        ? ("saved" as const)
        : ("idle" as const)

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium transition-opacity duration-300",
        state === "saving" && "text-muted-foreground",
        state === "saved" && "text-emerald-600 dark:text-emerald-400",
        state === "dirty" && "text-amber-600 dark:text-amber-400",
        state === "idle" && "text-muted-foreground/0",
        className
      )}
      aria-live="polite"
      aria-label={
        state === "saving"
          ? "Saving"
          : state === "saved"
            ? "Saved"
            : state === "dirty"
              ? "Unsaved changes"
              : ""
      }
    >
      {/* Saving state */}
      {state === "saving" && (
        <span className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-300">
          <Loader2 className="size-3 animate-spin" />
          <span>Saving...</span>
        </span>
      )}

      {/* Saved state */}
      {state === "saved" && (
        <span className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-300">
          <Check className="size-3" />
          <span>Saved</span>
        </span>
      )}

      {/* Dirty / unsaved state */}
      {state === "dirty" && (
        <span className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-300">
          <AlertCircle className="size-3" />
          <span>Unsaved changes</span>
        </span>
      )}
    </div>
  )
}

export { SavingIndicator }
