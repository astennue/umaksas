"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Pencil,
  X,
  FolderPlus,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { RoleGuard } from "@/components/auth/role-guard";

// ============================================
// Types
// ============================================

interface FieldConfig {
  options?: string[];
  placeholder?: string;
  maxFileSize?: number;
  allowedFormats?: string[];
  helpText?: string;
}

interface FormFieldItem {
  id: string;
  label: string;
  fieldType: string;
  context: string;
  configJson: FieldConfig | null;
  isRequired: boolean;
  orderIndex: number;
  section: string | null;
  step: number | null;
  isActive: boolean;
}

interface SectionData {
  name: string;
  fields: FormFieldItem[];
}

const FIELD_TYPES = [
  { value: "TEXT", label: "Text", description: "Single-line text input" },
  { value: "TEXTAREA", label: "Paragraph", description: "Multi-line text / essay" },
  { value: "NUMBER", label: "Number", description: "Numeric input" },
  { value: "EMAIL", label: "Email", description: "Email address input" },
  { value: "PHONE", label: "Phone", description: "Phone number input" },
  { value: "DATE", label: "Date", description: "Date picker" },
  { value: "SELECT", label: "Dropdown", description: "Single select dropdown" },
  { value: "CHECKBOX", label: "Checkbox", description: "Checkbox options" },
  { value: "FILE_UPLOAD", label: "File Upload", description: "File upload field" },
  { value: "HEADING", label: "Heading", description: "Section heading text" },
  { value: "PARAGRAPH", label: "Plain Text", description: "Informational text block" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  TEXT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TEXTAREA: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  NUMBER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  EMAIL: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  PHONE: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  DATE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  SELECT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CHECKBOX: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  FILE_UPLOAD: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  HEADING: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  PARAGRAPH: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const DEFAULT_SECTIONS = [
  "Personal Information",
  "Family Background",
  "Educational Background",
  "Availability",
  "Essays",
  "Documents",
];

// ============================================
// Loading Skeleton
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ============================================
// Field Edit Dialog
// ============================================

function FieldEditDialog({
  field,
  sectionName,
  open,
  onClose,
  onSave,
}: {
  field: Partial<FormFieldItem>;
  sectionName: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<FormFieldItem>) => void;
}) {
  // Use field.id as key to force remount when editing a different field
  const [label, setLabel] = useState(() => field.label || "");
  const [fieldType, setFieldType] = useState(() => field.fieldType || "TEXT");
  const [isRequired, setIsRequired] = useState(() => field.isRequired || false);
  const [placeholder, setPlaceholder] = useState(() => field.configJson?.placeholder || "");
  const [helpText, setHelpText] = useState(() => field.configJson?.helpText || "");
  const [options, setOptions] = useState<string[]>(() => field.configJson?.options || []);
  const [newOption, setNewOption] = useState("");
  const [maxFileSize, setMaxFileSize] = useState(() => field.configJson?.maxFileSize || 5);
  const [allowedFormats, setAllowedFormats] = useState<string[]>(() =>
    field.configJson?.allowedFormats || ["pdf", "jpg", "png"]
  );
  const [newFormat, setNewFormat] = useState("");

  const needsOptions = ["SELECT", "CHECKBOX"].includes(fieldType);
  const isFileUpload = fieldType === "FILE_UPLOAD";
  const isDecorative = ["HEADING", "PARAGRAPH"].includes(fieldType);

  const handleSave = () => {
    if (!label.trim()) {
      toast.error("Field label is required");
      return;
    }

    const config: FieldConfig = {};
    if (placeholder.trim()) config.placeholder = placeholder.trim();
    if (helpText.trim()) config.helpText = helpText.trim();
    if (needsOptions && options.length > 0) config.options = options.filter((o) => o.trim());
    if (isFileUpload) {
      config.maxFileSize = maxFileSize;
      if (allowedFormats.length > 0) config.allowedFormats = allowedFormats.filter((f) => f.trim());
    }

    onSave({
      label: label.trim(),
      fieldType,
      isRequired,
      configJson: Object.keys(config).length > 0 ? config : null,
    });
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setOptions((prev) => [...prev, newOption.trim()]);
    setNewOption("");
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const addFormat = () => {
    if (!newFormat.trim()) return;
    setAllowedFormats((prev) => [...prev, newFormat.trim().toLowerCase()]);
    setNewFormat("");
  };

  const removeFormat = (index: number) => {
    setAllowedFormats((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {field.id ? "Edit Field" : "Add Field"}
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              {sectionName}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Configure the form field properties for the application form.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="field-label" className="text-sm font-medium">
              Field Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Why do you want to apply?"
              className="h-9"
            />
          </div>

          {/* Field Type */}
          <div className="space-y-1.5">
            <Label htmlFor="field-type" className="text-sm font-medium">
              Field Type
            </Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{ft.label}</span>
                      <span className="text-xs text-muted-foreground">— {ft.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Required toggle (not for decorative types) */}
          {!isDecorative && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Required</Label>
                <p className="text-xs text-muted-foreground">
              Applicants must fill this field
                </p>
              </div>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          )}

          {/* Placeholder */}
          {!isDecorative && !needsOptions && !isFileUpload && (
            <div className="space-y-1.5">
              <Label htmlFor="field-placeholder" className="text-sm font-medium">
                Placeholder Text
              </Label>
              <Input
                id="field-placeholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="e.g., Enter your answer..."
                className="h-9"
              />
            </div>
          )}

          {/* Help Text */}
          <div className="space-y-1.5">
            <Label htmlFor="field-helptext" className="text-sm font-medium">
              Help Text
            </Label>
            <Textarea
              id="field-helptext"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Optional help text shown below the field..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Options management for SELECT and CHECKBOX */}
          {needsOptions && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Choices</Label>
                <p className="text-xs text-muted-foreground">
                  Add the options available for this field
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add a choice..."
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={!newOption.trim()}
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
              {options.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-lg border p-2">
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 text-sm"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground text-xs font-mono">#{idx + 1}</span>
                        {opt}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeOption(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* File Upload configuration */}
          {isFileUpload && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">File Upload Settings</Label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-file-size" className="text-xs font-medium text-muted-foreground">
                  Maximum File Size (MB)
                </Label>
                <Input
                  id="max-file-size"
                  type="number"
                  min={1}
                  max={50}
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(parseInt(e.target.value) || 5)}
                  className="h-9 w-32"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Allowed Formats
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    placeholder="e.g., pdf"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFormat();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFormat}
                    disabled={!newFormat.trim()}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>
                {allowedFormats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {allowedFormats.map((fmt, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeFormat(idx)}
                      >
                        .{fmt}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!label.trim()}
            className="bg-[#003366] hover:bg-[#003366]/90 text-white"
          >
            {field.id ? "Update Field" : "Add Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Section Rename Dialog
// ============================================

function SectionRenameDialog({
  currentName,
  open,
  onClose,
  onSave,
}: {
  currentName: string;
  open: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
}) {
  const [name, setName] = useState(() => currentName);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Rename Section</DialogTitle>
          <DialogDescription>
            Enter a new name for the &quot;{currentName}&quot; section.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="section-name">Section Name</Label>
          <Input
            id="section-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Additional Information"
            className="h-9"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) return;
              onSave(name.trim());
            }}
            disabled={!name.trim() || name.trim() === currentName}
            className="bg-[#003366] hover:bg-[#003366]/90 text-white"
          >
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Section Card
// ============================================

function SectionCard({
  section,
  isFirst,
  isLast,
  onAddField,
  onEditField,
  onDeleteField,
  onMoveFieldUp,
  onMoveFieldDown,
  onRenameSection,
  onDeleteSection,
  onMoveSectionUp,
  onMoveSectionDown,
}: {
  section: SectionData;
  isFirst: boolean;
  isLast: boolean;
  onAddField: () => void;
  onEditField: (field: FormFieldItem) => void;
  onDeleteField: (field: FormFieldItem) => void;
  onMoveFieldUp: (field: FormFieldItem) => void;
  onMoveFieldDown: (field: FormFieldItem) => void;
  onRenameSection: () => void;
  onDeleteSection: () => void;
  onMoveSectionUp: () => void;
  onMoveSectionDown: () => void;
}) {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-amber-500 to-amber-600",
    "from-purple-500 to-purple-600",
    "from-rose-500 to-rose-600",
    "from-cyan-500 to-cyan-600",
    "from-teal-500 to-teal-600",
  ];

  const hashStr = (s: string) =>
    s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const colorIdx = Math.abs(hashStr(section.name)) % colors.length;

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Top accent bar */}
      <div className={cn("h-1.5 bg-gradient-to-r", colors[colorIdx])} />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onMoveSectionUp}
                disabled={isFirst}
                title="Move section up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onMoveSectionDown}
                disabled={isLast}
                title="Move section down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">
                {section.name}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {section.fields.length} field{section.fields.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onRenameSection}
            >
              <Pencil className="h-3 w-3" />
              Rename
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDeleteSection}
              title="Delete section"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Fields list */}
        <div className="space-y-2">
          {section.fields.length === 0 && (
            <div className="rounded-lg border border-dashed py-6 text-center">
              <p className="text-sm text-muted-foreground">No fields in this section</p>
            </div>
          )}

          {section.fields.map((field, idx) => {
            const typeLabel = FIELD_TYPES.find((t) => t.value === field.fieldType)?.label || field.fieldType;
            const typeColor = TYPE_COLORS[field.fieldType] || "bg-gray-100 text-gray-700";

            return (
              <div
                key={field.id}
                className="group flex items-center gap-2 rounded-lg border p-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                {/* Drag handle & order */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                </div>

                {/* Field info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{field.label}</span>
                    {field.isRequired && (
                      <span className="text-destructive text-xs">*</span>
                    )}
                  </div>
                </div>

                {/* Type badge */}
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] shrink-0 px-1.5 py-0", typeColor)}
                >
                  {typeLabel}
                </Badge>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onMoveFieldUp(field)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onMoveFieldDown(field)}
                    disabled={idx === section.fields.length - 1}
                    title="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEditField(field)}
                    title="Edit field"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteField(field)}
                    title="Delete field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add field button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-2 border-dashed text-muted-foreground hover:text-foreground"
          onClick={onAddField}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Field
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main CMS Component
// ============================================

function ApplicationCMS() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Data state
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [originalFields, setOriginalFields] = useState<FormFieldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [editingField, setEditingField] = useState<Partial<FormFieldItem> | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<string>("");
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // Group fields by section
  const sections: SectionData[] = (() => {
    const sectionMap = new Map<string, FormFieldItem[]>();
    for (const f of fields) {
      const sec = f.section || "Other";
      if (!sectionMap.has(sec)) sectionMap.set(sec, []);
      sectionMap.get(sec)!.push(f);
    }
    return Array.from(sectionMap.entries())
      .map(([name, sectFields]) => ({ name, fields: sectFields }))
      .sort((a, b) => {
        // Sort sections by their first field's orderIndex
        const aOrder = a.fields[0]?.orderIndex ?? Infinity;
        const bOrder = b.fields[0]?.orderIndex ?? Infinity;
        return aOrder - bOrder;
      });
  })();

  // Check for unsaved changes
  const hasChanges = (() => {
    if (originalFields.length === 0 && fields.length === 0) return false;
    if (originalFields.length !== fields.length) return true;
    return fields.some((f, i) => {
      const orig = originalFields[i];
      return (
        f.id !== orig?.id ||
        f.label !== orig?.label ||
        f.fieldType !== orig?.fieldType ||
        f.isRequired !== orig?.isRequired ||
        f.orderIndex !== orig?.orderIndex ||
        f.section !== orig?.section ||
        JSON.stringify(f.configJson) !== JSON.stringify(orig?.configJson)
      );
    });
  })();

  const totalFields = fields.length;

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/application-fields");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const fetched: FormFieldItem[] = (data.fields || []).map((f: Record<string, unknown>) => ({
        id: f.id as string,
        label: (f.label as string) || "",
        fieldType: (f.fieldType as string) || "TEXT",
        context: (f.context as string) || "APPLICATION",
        configJson: (f.configJson as FieldConfig | null) || null,
        isRequired: (f.isRequired as boolean) ?? false,
        orderIndex: (f.orderIndex as number) || 0,
        section: (f.section as string | null) || null,
        step: (f.step as number | null) || null,
        isActive: (f.isActive as boolean) ?? true,
      }));
      setFields(fetched);
      setOriginalFields(fetched);
    } catch {
      toast.error("Failed to load application fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // Handlers: Field CRUD
  // ============================================

  const handleAddFieldToSection = (sectionName: string) => {
    const maxOrder = fields
      .filter((f) => f.section === sectionName)
      .reduce((max, f) => Math.max(max, f.orderIndex), -1);

    setEditingField({
      id: "",
      label: "",
      fieldType: "TEXT",
      isRequired: false,
      orderIndex: maxOrder + 1,
      section: sectionName,
      step: null,
      configJson: null,
      context: "APPLICATION",
      isActive: true,
    });
    setEditingSection(sectionName);
    setFieldDialogOpen(true);
  };

  const handleEditField = (field: FormFieldItem) => {
    setEditingField({ ...field });
    setEditingSection(field.section || "");
    setFieldDialogOpen(true);
  };

  const handleSaveField = async (data: Partial<FormFieldItem>) => {
    if (!editingField) return;

    try {
      if (editingField.id) {
        // Update existing field
        const res = await fetch(`/api/application-fields/${editingField.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update field");

        const updated = await res.json();
        setFields((prev) =>
          prev.map((f) =>
            f.id === editingField.id
              ? {
                  ...f,
                  ...updated,
                  configJson: updated.configJson ? (typeof updated.configJson === "string" ? JSON.parse(updated.configJson) : updated.configJson) : null,
                }
              : f
          )
        );
        toast.success("Field updated");
      } else {
        // Create new field
        const res = await fetch("/api/application-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            section: editingSection,
            orderIndex: data.orderIndex ?? fields.length,
          }),
        });
        if (!res.ok) throw new Error("Failed to create field");

        const created = await res.json();
        setFields((prev) => [
          ...prev,
          {
            ...created,
            configJson: created.configJson ? (typeof created.configJson === "string" ? JSON.parse(created.configJson) : created.configJson) : null,
          },
        ]);
        toast.success("Field added");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setFieldDialogOpen(false);
      setEditingField(null);
    }
  };

  const handleDeleteField = async (field: FormFieldItem) => {
    const confirmed = await confirm({
      title: "Delete Field",
      description: `Are you sure you want to delete "${field.label}"? This will also delete any existing responses for this field.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/application-fields/${field.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete field");

      setFields((prev) => prev.filter((f) => f.id !== field.id));
      toast.success("Field deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete field");
    }
  };

  // ============================================
  // Handlers: Section management
  // ============================================

  const handleAddSection = () => {
    if (!newSectionName.trim()) {
      toast.error("Section name is required");
      return;
    }
    if (sections.some((s) => s.name.toLowerCase() === newSectionName.trim().toLowerCase())) {
      toast.error("A section with this name already exists");
      return;
    }

    // Create a heading field to anchor the section
    const maxOrder = fields.reduce((max, f) => Math.max(max, f.orderIndex), -1);

    setFields((prev) => [
      ...prev,
      {
        id: `temp-section-${Date.now()}`,
        label: newSectionName.trim(),
        fieldType: "HEADING",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: maxOrder + 1,
        section: newSectionName.trim(),
        step: null,
        isActive: true,
      },
    ]);
    setNewSectionName("");
    toast.success(`Section "${newSectionName.trim()}" added`);
  };

  const handleRenameSection = async (oldName: string, newName: string) => {
    if (sections.some((s) => s.name.toLowerCase() === newName.toLowerCase() && s.name !== oldName)) {
      toast.error("A section with this name already exists");
      return;
    }

    // Update all fields in this section
    const sectionFields = fields.filter((f) => f.section === oldName);
    if (sectionFields.length === 0) {
      // Just update the local state for the heading field
      setFields((prev) =>
        prev.map((f) =>
          f.section === oldName ? { ...f, section: newName } : f
        )
      );
      toast.success("Section renamed");
      return;
    }

    // Save to API
    try {
      await Promise.all(
        sectionFields.map((f) =>
          fetch(`/api/application-fields/${f.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section: newName }),
          })
        )
      );

      setFields((prev) =>
        prev.map((f) =>
          f.section === oldName ? { ...f, section: newName } : f
        )
      );
      toast.success("Section renamed");
    } catch {
      toast.error("Failed to rename section");
    }
  };

  const handleDeleteSection = async (sectionName: string) => {
    const sectionFieldCount = fields.filter((f) => f.section === sectionName).length;

    const confirmed = await confirm({
      title: "Delete Section",
      description: `Are you sure you want to delete "${sectionName}" and all its ${sectionFieldCount} field${sectionFieldCount !== 1 ? "s" : ""}? This action cannot be undone.`,
      confirmText: "Delete Section",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      const sectionFields = fields.filter((f) => f.section === sectionName && f.id.startsWith("temp-"));
      const realFields = fields.filter((f) => f.section === sectionName && !f.id.startsWith("temp-"));

      // Delete real fields from API
      await Promise.all(
        realFields.map((f) =>
          fetch(`/api/application-fields/${f.id}`, { method: "DELETE" })
        )
      );

      // Remove all fields in section from local state
      setFields((prev) => prev.filter((f) => f.section !== sectionName));
      toast.success(`Section "${sectionName}" deleted`);
    } catch {
      toast.error("Failed to delete section");
    }
  };

  // ============================================
  // Handlers: Reorder
  // ============================================

  const handleMoveFieldUp = (field: FormFieldItem) => {
    const sectionFields = fields.filter((f) => f.section === field.section).sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = sectionFields.findIndex((f) => f.id === field.id);
    if (idx <= 0) return;

    const prev = sectionFields[idx - 1];
    // Swap orderIndex
    setFields((prevFields) =>
      prevFields.map((f) => {
        if (f.id === field.id) return { ...f, orderIndex: prev.orderIndex };
        if (f.id === prev.id) return { ...f, orderIndex: field.orderIndex };
        return f;
      })
    );
  };

  const handleMoveFieldDown = (field: FormFieldItem) => {
    const sectionFields = fields.filter((f) => f.section === field.section).sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = sectionFields.findIndex((f) => f.id === field.id);
    if (idx < 0 || idx >= sectionFields.length - 1) return;

    const next = sectionFields[idx + 1];
    setFields((prevFields) =>
      prevFields.map((f) => {
        if (f.id === field.id) return { ...f, orderIndex: next.orderIndex };
        if (f.id === next.id) return { ...f, orderIndex: field.orderIndex };
        return f;
      })
    );
  };

  const handleMoveSectionUp = (sectionName: string) => {
    const secIdx = sections.findIndex((s) => s.name === sectionName);
    if (secIdx <= 0) return;

    const prevSection = sections[secIdx - 1];
    // Swap all fields' orderIndex between the two sections
    const currentFields = fields.filter((f) => f.section === sectionName);
    const prevFields = fields.filter((f) => f.section === prevSection.name);

    if (currentFields.length === 0 || prevFields.length === 0) return;

    // Simple swap: set current section fields to use prev section's order range
    const allOrders = [...currentFields, ...prevFields].map((f) => f.orderIndex).sort((a, b) => a - b);

    const updates = new Map<string, number>();
    currentFields.forEach((f, i) => updates.set(f.id, allOrders[i]));
    prevFields.forEach((f, i) => updates.set(f.id, allOrders[currentFields.length + i]));

    setFields((prev) =>
      prev.map((f) => (updates.has(f.id) ? { ...f, orderIndex: updates.get(f.id)! } : f))
    );
  };

  const handleMoveSectionDown = (sectionName: string) => {
    const secIdx = sections.findIndex((s) => s.name === sectionName);
    if (secIdx < 0 || secIdx >= sections.length - 1) return;

    const nextSection = sections[secIdx + 1];
    const currentFields = fields.filter((f) => f.section === sectionName);
    const nextFields = fields.filter((f) => f.section === nextSection.name);

    if (currentFields.length === 0 || nextFields.length === 0) return;

    const allOrders = [...currentFields, ...nextFields].map((f) => f.orderIndex).sort((a, b) => a - b);

    const updates = new Map<string, number>();
    nextFields.forEach((f, i) => updates.set(f.id, allOrders[i]));
    currentFields.forEach((f, i) => updates.set(f.id, allOrders[nextFields.length + i]));

    setFields((prev) =>
      prev.map((f) => (updates.has(f.id) ? { ...f, orderIndex: updates.get(f.id)! } : f))
    );
  };

  // ============================================
  // Save handler
  // ============================================

  const handleSave = async () => {
    const confirmed = await confirm({
      title: "Save Application Form",
      description: `Save all changes to the application form? This includes ${totalFields} fields across ${sections.length} sections.`,
      confirmText: "Save Changes",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      // 1. Handle new fields (temp IDs)
      const newFields = fields.filter((f) => f.id.startsWith("temp-"));
      for (const nf of newFields) {
        const res = await fetch("/api/application-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: nf.label,
            fieldType: nf.fieldType,
            isRequired: nf.isRequired,
            orderIndex: nf.orderIndex,
            section: nf.section,
            configJson: nf.configJson,
          }),
        });
        if (!res.ok) throw new Error("Failed to create field");
        const created = await res.json();

        // Replace temp ID in local state
        setFields((prev) =>
          prev.map((f) =>
            f.id === nf.id
              ? { ...f, id: created.id }
              : f
          )
        );
      }

      // 2. Reorder all fields
      const allFieldIds = fields.map((f, i) => ({ id: f.id, orderIndex: i }));
      await fetch("/api/application-fields/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: allFieldIds }),
      });

      // Reload to get fresh data
      await fetchData();
      toast.success("Application form saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* Field Edit Dialog */}
      <FieldEditDialog
        key={editingField?.id || 'new'}
        field={editingField || {}}
        sectionName={editingSection || ""}
        open={fieldDialogOpen}
        onClose={() => {
          setFieldDialogOpen(false);
          setEditingField(null);
        }}
        onSave={handleSaveField}
      />

      {/* Section Rename Dialog */}
      <SectionRenameDialog
        key={editingSectionName}
        currentName={editingSectionName}
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        onSave={(newName) => {
          handleRenameSection(editingSectionName, newName);
          setRenameDialogOpen(false);
        }}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Application CMS</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage form sections and fields for the application form
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setOriginalFields([...fields]);
              toast.info("Changes discarded");
            }}
            variant="outline"
            disabled={!hasChanges}
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-[#003366] hover:bg-[#003366]/90 text-white min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You have unsaved changes
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {sections.length} section{sections.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {totalFields} field{totalFields !== 1 ? "s" : ""}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Manage sections and custom fields for the SA application form
        </span>
      </div>

      {/* Sections list */}
      {sections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
              <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              No sections yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
              Add a section to start building your application form.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((sec, idx) => (
            <SectionCard
              key={sec.name}
              section={sec}
              isFirst={idx === 0}
              isLast={idx === sections.length - 1}
              onAddField={() => handleAddFieldToSection(sec.name)}
              onEditField={handleEditField}
              onDeleteField={handleDeleteField}
              onMoveFieldUp={handleMoveFieldUp}
              onMoveFieldDown={handleMoveFieldDown}
              onRenameSection={() => {
                setEditingSectionName(sec.name);
                setRenameDialogOpen(true);
              }}
              onDeleteSection={() => handleDeleteSection(sec.name)}
              onMoveSectionUp={() => handleMoveSectionUp(sec.name)}
              onMoveSectionDown={() => handleMoveSectionDown(sec.name)}
            />
          ))}
        </div>
      )}

      {/* Add Section */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name..."
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSection();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 shrink-0"
              onClick={handleAddSection}
              disabled={!newSectionName.trim()}
            >
              <FolderPlus className="h-4 w-4" />
              Add Section
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Page Export with RoleGuard
// ============================================

export default function ApplicationCMSPage() {
  return (
    <RoleGuard
      allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}
      presidentOnly
    >
      <ApplicationCMS />
    </RoleGuard>
  );
}
