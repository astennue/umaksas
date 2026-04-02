"use client"

import { Pencil, Trash2, Eye } from "lucide-react"

interface CRUDActionsProps {
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  editLabel?: string
  deleteLabel?: string
  viewLabel?: string
}

export function CRUDActions({
  onEdit,
  onDelete,
  onView,
  editLabel = "Edit",
  deleteLabel = "Delete",
  viewLabel = "View",
}: CRUDActionsProps) {
  return (
    <div className="crud-actions">
      {onView && (
        <button
          onClick={onView}
          className="crud-btn crud-btn-enter rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
          title={viewLabel}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="crud-btn crud-btn-enter rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
          title={editLabel}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="crud-btn crud-btn-enter rounded-lg hover:bg-red-50 text-red-600 transition-colors"
          title={deleteLabel}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
