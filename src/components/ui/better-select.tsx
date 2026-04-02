"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BetterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * BetterSelect — a styled wrapper around the shadcn Select.
 *
 * Fixes the common complaints:
 *  1. The trigger now always shows the selected value (or placeholder) as full-width text.
 *  2. The built-in Radix chevron icon is hidden; a clearly visible `ChevronDown` is rendered
 *     instead so there is exactly ONE chevron.
 *  3. Consistent styling across all pages: h-10, w-full, rounded-lg, visible borders, and
 *     clear focus ring.
 */
export function BetterSelect({
  value,
  onValueChange,
  placeholder = "Select an option...",
  className,
  children,
  disabled = false,
}: BetterSelectProps) {
  const hasValue = value && value !== "all" && value !== "";

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          /* ── size & width ─────────────────────────────── */
          "h-10 w-full",
          /* ── shape ────────────────────────────────────── */
          "rounded-lg",
          /* ── border & background ──────────────────────── */
          "border-gray-300 bg-white px-3 text-sm",
          /* ── focus ring ───────────────────────────────── */
          "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:ring-offset-0",
          /* ── transitions ──────────────────────────────── */
          "transition-all duration-150",
          /* ── dark mode ────────────────────────────────── */
          "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
          /* ── placeholder color when no meaningful value ── */
          !hasValue && "text-gray-500 dark:text-gray-400",
          /* ── hide the default Radix chevron so we can add our own ── */
          "[&>span:last-child]:hidden",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-auto" />
      </SelectTrigger>
      <SelectContent className="rounded-lg border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        {children}
      </SelectContent>
    </Select>
  );
}
