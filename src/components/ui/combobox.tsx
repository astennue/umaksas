"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComboboxOption {
  value: string
  label: string
  group?: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  searchable?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  className,
  disabled = false,
  searchable = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((o) => o.value === value)
  const filtered = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options

  // Group options if they have groups
  const groups = filtered.reduce<Record<string, ComboboxOption[]>>((acc, opt) => {
    const group = opt.group || "__ungrouped"
    if (!acc[group]) acc[group] = []
    acc[group].push(opt)
    return acc
  }, {})

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Reset search when dropdown closes (via setOpen wrapper)
  const handleToggle = () => {
    if (open) setSearch("")
    setOpen(!open)
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { if (!disabled) handleToggle() }}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-800 dark:shadow-gray-900/50",
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:hover:bg-gray-700",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedOption && "text-gray-500 dark:text-gray-400",
          open && "ring-2 ring-blue-500 border-blue-500"
        )}
        disabled={disabled}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        {value ? (
          <X
            className="w-4 h-4 text-gray-400 shrink-0 ml-2 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            onClick={(e) => { e.stopPropagation(); onChange?.(""); }}
          />
        ) : (
          <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform dark:text-gray-500", open && "rotate-180")} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-900/50">
          {/* Search input */}
          {searchable && (
            <div className="flex items-center border-b border-gray-100 px-3 py-2 dark:border-gray-700">
              <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 text-sm bg-transparent border-0 outline-none placeholder:text-gray-400 dark:text-gray-200"
              />
            </div>
          )}

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </div>
            ) : (
              Object.entries(groups).map(([group, opts]) => (
                <div key={group}>
                  {group !== "__ungrouped" && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {group}
                    </div>
                  )}
                  {opts.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => {
                        onChange?.(option.value)
                        setOpen(false)
                        setSearch("")
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                        option.value === value
                          ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700",
                        option.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {option.value === value && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0 dark:text-blue-400" />
                      )}
                      <span className={cn("truncate", option.value !== value && "ml-6")}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
