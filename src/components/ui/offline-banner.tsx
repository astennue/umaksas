"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

const AUTO_HIDE_DELAY_MS = 3000

function OfflineBanner({ className }: { className?: string }) {
  const [isOffline, setIsOffline] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState(false)
  const [justCameBackOnline, setJustCameBackOnline] = React.useState(false)
  const autoHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set initial online status on mount
  React.useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true)
      setShowBanner(true)
    }
  }, [])

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOffline = () => {
      // Clear any pending auto-hide timer
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current)
        autoHideTimerRef.current = null
      }
      setIsOffline(true)
      setJustCameBackOnline(false)
      setShowBanner(true)
    }

    const handleOnline = () => {
      setIsOffline(false)
      setJustCameBackOnline(true)

      // Auto-hide the banner after coming back online
      autoHideTimerRef.current = setTimeout(() => {
        setShowBanner(false)
        setJustCameBackOnline(false)
      }, AUTO_HIDE_DELAY_MS)
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-all duration-300 ease-in-out",
        // Slide in/out using transform
        showBanner
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium shadow-lg",
          isOffline
            ? "bg-amber-500 text-white dark:bg-amber-600"
            : "bg-emerald-500 text-white dark:bg-emerald-600"
        )}
      >
        {isOffline ? (
          <>
            <WifiOff className="size-4 shrink-0" />
            <span>
              You&apos;re offline. Changes will sync when reconnected.
            </span>
          </>
        ) : (
          <span>You&apos;re back online!</span>
        )}
      </div>
    </div>
  )
}

export { OfflineBanner }
