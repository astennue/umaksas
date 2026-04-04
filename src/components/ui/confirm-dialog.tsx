"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "destructive" | "default"
  icon?: LucideIcon
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon: Icon,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive"

  const handleConfirm = React.useCallback(() => {
    void onConfirm()
  }, [onConfirm])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            {Icon && (
              <div
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                  isDestructive
                    ? "bg-destructive/10 dark:bg-destructive/20"
                    : "bg-primary/10 dark:bg-primary/20"
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    isDestructive
                      ? "text-destructive"
                      : "text-primary"
                  )}
                />
              </div>
            )}
            <div className="space-y-1">
              <AlertDialogTitle
                className={cn(
                  isDestructive && "text-destructive"
                )}
              >
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription>{description}</AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <button
            className={cn(
              buttonVariants({
                variant: isDestructive ? "destructive" : "default",
              }),
              "cursor-pointer"
            )}
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmText}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ConfirmDialog, type ConfirmDialogProps }
