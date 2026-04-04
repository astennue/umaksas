"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link"
}

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  children?: React.ReactNode
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted/50 dark:bg-muted/30">
          <Icon className="size-7 text-muted-foreground/60" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <Button
          className="mt-5 cursor-pointer"
          variant={action.variant ?? "default"}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      {children && (
        <div className="mt-4 w-full max-w-sm">{children}</div>
      )}
    </div>
  )
}

export { EmptyState }
