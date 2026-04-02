"use client"

import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CRUDToolbarProps {
  title: string
  entityLabel: string
  onAdd?: () => void
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
}

export function CRUDToolbar({
  title,
  entityLabel,
  onAdd,
  onSearch,
  searchPlaceholder = `Search ${entityLabel}...`,
  children,
}: CRUDToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
        <p className="text-sm text-gray-500 mt-0.5 truncate">Manage {entityLabel}</p>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {onSearch && (
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
        {children}
        {onAdd && (
          <Button onClick={onAdd} size="sm" className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span> {entityLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
