"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OnDutyIndicatorProps {
  isOnDuty: boolean;
}

export function OnDutyIndicator({ isOnDuty }: OnDutyIndicatorProps) {
  if (!isOnDuty) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="absolute bottom-1 right-1 z-10">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white" />
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            On Duty
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
