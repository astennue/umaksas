"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadType = "photo" | "resume" | "registration" | "gradeReport" | "residenceImage";

interface FileUploadProps {
  type: UploadType;
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  required?: boolean;
}

const typeConfig: Record<
  UploadType,
  { accept: string; maxSizeMB: number; icon: typeof ImageIcon; label: string }
> = {
  photo: {
    accept: "image/jpeg,image/png,image/webp",
    maxSizeMB: 2,
    icon: ImageIcon,
    label: "2x2 Photo (JPG/PNG, max 2MB)",
  },
  resume: {
    accept: ".pdf,.doc,.docx",
    maxSizeMB: 5,
    icon: FileText,
    label: "Resume (PDF/DOC, max 5MB)",
  },
  registration: {
    accept: "image/jpeg,image/png,image/webp,.pdf",
    maxSizeMB: 5,
    icon: FileText,
    label: "Registration Form (Image/PDF, max 5MB)",
  },
  gradeReport: {
    accept: "image/jpeg,image/png,image/webp,.pdf",
    maxSizeMB: 5,
    icon: FileText,
    label: "Grade Report (Image/PDF, max 5MB)",
  },
  residenceImage: {
    accept: "image/jpeg,image/png,image/webp",
    maxSizeMB: 5,
    icon: ImageIcon,
    label: "Residence Proof (Image, max 5MB)",
  },
};

export function FileUpload({
  type,
  value,
  onChange,
  label,
  description,
  accept,
  maxSizeMB,
  className,
  required,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const config = typeConfig[type];

  const validateFile = useCallback(
    (file: File): boolean => {
      const maxSize = (maxSizeMB ?? config.maxSizeMB) * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File size must be less than ${maxSizeMB ?? config.maxSizeMB}MB`);
        return false;
      }
      setError("");
      return true;
    },
    [maxSizeMB, config.maxSizeMB]
  );

  const processFile = useCallback(
    (file: File) => {
      if (!validateFile(file)) return;

      setIsUploading(true);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;

        // For images, create a preview
        if (file.type.startsWith("image/")) {
          setPreview(result);
          onChange(result);
        } else {
          // For PDFs/docs, just store the base64
          onChange(result);
        }

        setIsUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [validateFile, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const removeFile = () => {
    onChange("");
    setPreview("");
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const IconComponent = config.icon;

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {value ? (
        <div className="relative rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
          <div className="flex items-center gap-3">
            {preview ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
                <IconComponent className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fileName || "Uploaded file"}</p>
              <p className="text-xs text-muted-foreground">File uploaded successfully</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={removeFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragging
              ? "border-[#1e3a8a] bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
              : "border-muted-foreground/25 bg-muted/30 hover:border-[#1e3a8a]/50 hover:bg-muted/50 dark:hover:border-blue-400/50"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#1e3a8a]" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </>
          ) : (
            <>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#1e3a8a]/10 dark:bg-[#1e3a8a]/20">
                <Upload className="h-5 w-5 text-[#1e3a8a] dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium">
                Drag & drop or <span className="text-[#1e3a8a] dark:text-blue-400">browse</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{config.label}</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept ?? config.accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
