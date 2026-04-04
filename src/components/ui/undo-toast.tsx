"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastWithUndoOptions {
  message: string
  description?: string
  undoLabel?: string
  onUndo: () => void | Promise<void>
  duration?: number
}

/**
 * UndoToastContent — the custom JSX rendered inside a sonner toast.
 * Managed internally; exported only for TypeScript completeness.
 */
function UndoToastContent({
  message,
  description,
  undoLabel,
  onUndo,
}: {
  message: string
  description?: string
  undoLabel?: string
  onUndo: () => void | Promise<void>
}) {
  const [undoing, setUndoing] = React.useState(false)

  const handleUndo = React.useCallback(async () => {
    setUndoing(true)
    try {
      await onUndo()
    } finally {
      toast.dismiss() // dismiss this toast after undo completes (or fails)
    }
  }, [onUndo])

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <button
        type="button"
        onClick={handleUndo}
        disabled={undoing}
        className={cn(
          "mt-1.5 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-medium transition-colors",
          "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        {undoing ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <RotateCcw className="size-3" />
        )}
        {undoing ? "Undoing..." : (undoLabel ?? "Undo")}
      </button>
    </div>
  )
}

/**
 * Shows a sonner toast with an "Undo" button.
 *
 * @example
 * ```ts
 * toastWithUndo({
 *   message: "Item deleted",
 *   description: "The record has been removed.",
 *   onUndo: async () => {
 *     await restoreItem(id)
 *   },
 * })
 * ```
 */
function toastWithUndo({
  message,
  description,
  undoLabel = "Undo",
  onUndo,
  duration = 8000,
}: ToastWithUndoOptions) {
  toast.custom(
    () => (
      <UndoToastContent
        message={message}
        description={description}
        undoLabel={undoLabel}
        onUndo={onUndo}
      />
    ),
    {
      duration,
    }
  )
}

export { toastWithUndo, UndoToastContent }
