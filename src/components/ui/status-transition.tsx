"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"

export interface StatusConfig {
  label: string
  color: string
  variant?: VariantProps<typeof Badge>["variant"]
}

export interface StatusTransitionProps {
  status: string
  config: Record<string, StatusConfig>
  animate?: boolean
  className?: string
  badgeClassName?: string
}

function StatusTransition({
  status,
  config,
  animate = true,
  className,
  badgeClassName,
}: StatusTransitionProps) {
  const current = config[status]

  // Render nothing if status is not in config
  if (!current) return null

  const badge = (
    <Badge
      variant={current.variant ?? "secondary"}
      className={cn("transition-colors", current.color, badgeClassName)}
    >
      {current.label}
    </Badge>
  )

  // Static rendering when animation is disabled
  if (!animate) {
    return <div className={cn("inline-flex", className)}>{badge}</div>
  }

  return (
    <div className={cn("inline-flex overflow-hidden", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -4 }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {badge}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export {
  StatusTransition,
}
