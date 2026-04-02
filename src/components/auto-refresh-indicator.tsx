"use client";

import { useRef, useEffect } from "react";

interface AutoRefreshIndicatorProps {
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
}

/**
 * A subtle 2px progress bar at the top of the viewport during auto-refresh.
 * Uses UMAK brand gradient (#003366 blue → #C5A000 gold).
 */
export function AutoRefreshIndicator({ isRefreshing }: AutoRefreshIndicatorProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const prevRefreshing = useRef(false);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (isRefreshing && !prevRefreshing.current) {
      // Refresh started: restart expand animation
      bar.style.animation = "none";
      // Force reflow
      void bar.offsetWidth;
      bar.style.animation = "auto-refresh-expand 800ms ease-out forwards";
      bar.style.opacity = "1";
    } else if (!isRefreshing && prevRefreshing.current) {
      // Refresh completed: fade out
      bar.style.animation = "auto-refresh-fadeout 400ms ease-in forwards";
    }

    prevRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  // Only render the style tag and bar when refreshing or during fadeout
  // We always render but the bar is invisible when not animating
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none opacity-0"
      data-refreshing={isRefreshing ? "true" : undefined}
      ref={barRef as React.RefObject<HTMLDivElement>}
    >
      <div
        className="h-[2px] w-full origin-left opacity-0"
        data-refresh-bar="true"
      />
      <style>{`
        [data-refreshing] > div {
          animation: auto-refresh-expand 800ms ease-out forwards !important;
        }
        @keyframes auto-refresh-expand {
          0% { transform: scaleX(0); opacity: 1; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes auto-refresh-fadeout {
          0% { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
