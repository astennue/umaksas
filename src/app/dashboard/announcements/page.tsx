"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Loader2,
  Megaphone,
  FileText,
  Archive,
  X,
  CheckCircle2,
  Upload,
  AlertCircle,
  Globe,
  Users,
  Shield,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { RoleGuard } from "@/components/auth/role-guard";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/hooks/use-confirm";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDebounce } from "@/hooks/use-debounce";

interface Announcement {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  imageUrl: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  isPublished: boolean;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: string;
  authorRole?: string;
  status?: string;
  visibility?: string;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; bar: string }> = {
  URGENT: { color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", label: "Urgent", bar: "bg-red-500" },
  HIGH: { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", label: "High", bar: "bg-orange-500" },
  NORMAL: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Normal", bar: "bg-blue-500" },
  LOW: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800/30", label: "Low", bar: "bg-gray-400 dark:bg-gray-600" },
};

const VISIBILITY_OPTIONS = [
  { value: "all", label: "Public (Everyone)", icon: Globe },
  { value: "sas_only", label: "Student Assistants Only", icon: Users },
  { value: "officers_only", label: "Officers & Admins Only", icon: Shield },
  { value: "supervisors_only", label: "Office Supervisors Only", icon: Briefcase },
];

const FILTER_TABS = [
  { key: "ALL", label: "All", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "PUBLISHED", label: "Published", icon: <Eye className="h-3.5 w-3.5" /> },
  { key: "DRAFT", label: "Draft", icon: <Archive className="h-3.5 w-3.5" /> },
  { key: "PINNED", label: "Pinned", icon: <Pin className="h-3.5 w-3.5" /> },
];

// Role badge configuration
const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  SUPER_ADMIN: { label: "Super Admin", bg: "bg-red-100 dark:bg-red-900/30", color: "text-red-700 dark:text-red-400" },
  ADVISER: { label: "Adviser", bg: "bg-purple-100 dark:bg-purple-900/30", color: "text-purple-700 dark:text-purple-400" },
  OFFICER: { label: "Officer", bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-700 dark:text-amber-400" },
  STUDENT_ASSISTANT: { label: "Student Assistant", bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-700 dark:text-emerald-400" },
  OFFICE_SUPERVISOR: { label: "Office Supervisor", bg: "bg-sky-100 dark:bg-sky-900/30", color: "text-sky-700 dark:text-sky-400" },
};

function getRoleBadge(role: string | null | undefined) {
  if (!role || !ROLE_CONFIG[role]) return null;
  const config = ROLE_CONFIG[role];
  return (
    <Badge variant="secondary" className={`${config.bg} ${config.color} border-0 text-[10px] font-medium px-1.5 py-0`}>{config.label}</Badge>
  );
}

interface FormData {
  title: string;
  content: string;
  excerpt: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  imageUrl: string;
  isPublished: boolean;
  isPinned: boolean;
  visibility: string;
}

const emptyForm: FormData = {
  title: "",
  content: "",
  excerpt: "",
  priority: "NORMAL",
  imageUrl: "",
  isPublished: false,
  isPinned: false,
  visibility: "all",
};

type UploadState = "idle" | "previewing" | "uploading" | "success" | "error";

export default function DashboardAnnouncementsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const canApprove = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);

  // Confirmation dialog
  const { confirm, ConfirmDialog } = useConfirm();

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  // Stats
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, pinned: 0 });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnnouncements(data.announcements);

      const total = data.announcements.length;
      const published = data.announcements.filter((a: Announcement) => a.isPublished).length;
      const draft = data.announcements.filter((a: Announcement) => !a.isPublished).length;
      const pinned = data.announcements.filter((a: Announcement) => a.isPinned).length;
      setStats({ total, published, draft, pinned });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Filtered announcements
  const filteredAnnouncements = announcements
    .filter((a) => {
      if (activeFilter === "PUBLISHED") return a.isPublished;
      if (activeFilter === "DRAFT") return !a.isPublished;
      if (activeFilter === "PINNED") return a.isPinned;
      return true;
    })
    .filter((a) => {
      if (!debouncedSearchQuery) return true;
      const q = debouncedSearchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q)
      );
    });

  // Image upload handler with states
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    // Show local preview first
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);
    setUploadState("previewing");

    // Then upload
    setUploadState("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "photo");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      setImagePreview(data.url);
      setUploadState("success");
      toast.success("Image uploaded");
      // Reset to idle after showing success
      setTimeout(() => setUploadState("idle"), 2000);
    } catch (err) {
      setUploadState("error");
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
      // Reset to idle after showing error
      setTimeout(() => setUploadState("idle"), 3000);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const removeImage = useCallback(() => {
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    setImagePreview("");
    setUploadState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Approve announcement (publish pending officer announcements)
  const handleApprove = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Announcement approved and published");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to approve announcement");
    }
  };

  // Open create dialog
  const openCreate = () => {
    setFormMode("create");
    setFormData(emptyForm);
    setEditingId(null);
    setImagePreview("");
    setUploadState("idle");
    setFormOpen(true);
  };

  // Open edit dialog
  const openEdit = (announcement: Announcement) => {
    setFormMode("edit");
    setFormData({
      title: announcement.title,
      content: announcement.content,
      excerpt: announcement.excerpt || "",
      priority: announcement.priority,
      imageUrl: announcement.imageUrl || "",
      isPublished: announcement.isPublished,
      isPinned: announcement.isPinned,
      visibility: announcement.visibility || "all",
    });
    setImagePreview(announcement.imageUrl || "");
    setUploadState("idle");
    setEditingId(announcement.id);
    setFormOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setFormLoading(true);
    try {
      let res: Response;

      // Use FormData for large payloads (when image is included)
      if (formData.imageUrl && formData.imageUrl.length > 100000) {
        // Large base64 - send as FormData with file
        const fd = new FormData();
        fd.append('title', formData.title.trim());
        fd.append('content', formData.content.trim());
        if (formData.excerpt.trim()) fd.append('excerpt', formData.excerpt.trim());
        fd.append('priority', formData.priority);
        fd.append('isPublished', String(formData.isPublished));
        fd.append('isPinned', String(formData.isPinned));
        fd.append('visibility', formData.visibility);

        // Convert data URL back to File
        const res_upload = await fetch(formData.imageUrl);
        const blob = await res_upload.blob();
        const ext = formData.imageUrl.includes('png') ? 'png' : formData.imageUrl.includes('gif') ? 'gif' : 'jpg';
        const file = new File([blob], `cover.${ext}`, { type: blob.type });
        fd.append('image', file);

        if (formMode === "create") {
          res = await fetch("/api/announcements", { method: "POST", body: fd });
        } else {
          res = await fetch(`/api/announcements/${editingId}`, { method: "PUT", body: fd });
        }
      } else {
        // Small or no image - use JSON
        const body = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          excerpt: formData.excerpt.trim() || undefined,
          priority: formData.priority,
          imageUrl: formData.imageUrl.trim() || undefined,
          isPublished: formData.isPublished,
          isPinned: formData.isPinned,
          visibility: formData.visibility,
        };
        if (formMode === "create") {
          res = await fetch("/api/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          res = await fetch(`/api/announcements/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(formMode === "create" ? "Announcement created" : "Announcement updated");
      setFormOpen(false);
      setPreviewOpen(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save announcement");
    } finally {
      setFormLoading(false);
    }
  };

  // Open preview
  const openPreview = () => {
    setPreviewOpen(true);
  };

  // Toggle publish
  const togglePublish = async (announcement: Announcement) => {
    if (announcement.isPublished) {
      const confirmed = await confirm({
        title: "Unpublish Announcement",
        description: "This announcement will be hidden from the public. You can re-publish it later.",
        confirmText: "Unpublish",
      });
      if (!confirmed) return;
    }
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !announcement.isPublished }),
      });
      if (!res.ok) throw new Error();
      toast.success(announcement.isPublished ? "Unpublished" : "Published");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to update announcement");
    }
  };

  // Toggle pin
  const togglePin = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !announcement.isPinned }),
      });
      if (!res.ok) throw new Error();
      toast.success(announcement.isPinned ? "Unpinned" : "Pinned");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to update announcement");
    }
  };

  // Keyboard shortcut: "n" to create new announcement
  useKeyboardShortcuts({
    n: () => { if (isAdmin) openCreate(); },
  });

  // Get visibility label
  const getVisibilityLabel = (vis: string) => {
    const opt = VISIBILITY_OPTIONS.find(o => o.value === vis);
    return opt ? opt.label : "Public (Everyone)";
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]}>
    <div className="space-y-6">
      {/* Page Header */}
      <CRUDToolbar
        title="Announcements"
        entityLabel="Announcements"
        onAdd={isAdmin ? openCreate : undefined}
        onSearch={setSearchQuery}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: <FileText className="h-4 w-4" />, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Published", value: stats.published, icon: <Eye className="h-4 w-4" />, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
          { label: "Draft", value: stats.draft, icon: <Archive className="h-4 w-4" />, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
          { label: "Pinned", value: stats.pinned, icon: <Pin className="h-4 w-4" />, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border-0 bg-white p-4 shadow-lg dark:bg-gray-800"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <Button
                key={tab.key}
                variant={activeFilter === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(tab.key)}
                className={
                  activeFilter === tab.key
                    ? "bg-blue-700 hover:bg-blue-800 text-white shadow-md gap-1.5"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 gap-1.5"
                }
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border-0 bg-white shadow-lg dark:bg-gray-800 p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-6 w-32 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-xl border-0 bg-white shadow-lg dark:bg-gray-800">
          <EmptyState
            icon={Megaphone}
            title="No Announcements Found"
            description={
              searchQuery || activeFilter !== "ALL"
                ? "No announcements match your current filters."
                : "Get started by creating your first announcement."
            }
            action={
              !searchQuery && activeFilter === "ALL" && isAdmin
                ? { label: "Create Announcement", onClick: openCreate }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((announcement, index) => {
              const config = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.NORMAL;
              const displayDate = announcement.publishedAt || announcement.createdAt;

              return (
                <motion.div
                  key={announcement.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                  className="group overflow-hidden rounded-xl border-0 bg-white shadow-lg transition-shadow hover:shadow-xl dark:bg-gray-800"
                >
                  {/* Cover Image */}
                  {announcement.imageUrl && (
                    <div className="relative w-full h-[180px] overflow-hidden">
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  )}

                  {/* Priority bar */}
                  <div className={`h-1 ${config.bar}`} />

                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        {/* Badges row */}
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className={`${config.bg} ${config.color} border-0 text-xs font-medium`}>
                            {config.label}
                          </Badge>
                          {announcement.status === "pending_approval" ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 text-xs">
                              Pending Approval
                            </Badge>
                          ) : announcement.isPublished ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-0 text-xs">
                              Draft
                            </Badge>
                          )}
                          {announcement.isPinned && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1 text-xs">
                              <Pin className="h-3 w-3" />
                              Pinned
                            </Badge>
                          )}
                          {announcement.visibility && announcement.visibility !== "all" && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-0 gap-1 text-xs">
                              <Shield className="h-3 w-3" />
                              {getVisibilityLabel(announcement.visibility)}
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                          {announcement.title}
                        </h3>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400 min-w-0">
                          <span className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1 max-w-[300px]">{announcement.author}</span>
                          {getRoleBadge(announcement.authorRole)}
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <time dateTime={displayDate}>
                            {format(new Date(displayDate), "MMM d, yyyy 'at' h:mm a")}
                          </time>
                        </div>

                        {/* Excerpt */}
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                          {announcement.excerpt || announcement.content}
                        </p>
                      </div>

                      {/* Actions */}
                      {isAdmin && (
                        <div className="flex flex-shrink-0 items-center gap-1 sm:ml-4">
                          {/* Approve button for pending officer announcements */}
                          {canApprove && announcement.status === "pending_approval" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(announcement)}
                              className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/20 gap-1"
                              title="Approve"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Approve</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePublish(announcement)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
                            title={announcement.isPublished ? "Unpublish" : "Publish"}
                          >
                            {announcement.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePin(announcement)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/20"
                            title={announcement.isPinned ? "Unpin" : "Pin"}
                          >
                            {announcement.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(announcement)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: "Delete Announcement",
                                  description: "Delete this announcement? This cannot be undone.",
                                  confirmText: "Delete",
                                  variant: "destructive",
                                });
                                if (!confirmed) return;
                                try {
                                  const res = await fetch(`/api/announcements/${announcement.id}`, { method: "DELETE" });
                                  if (!res.ok) throw new Error();
                                  toast.success("Announcement deleted");
                                  fetchAnnouncements();
                                } catch {
                                  toast.error("Failed to delete announcement");
                                }
                              }}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setPreviewOpen(false); setFormOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {formMode === "create" ? "Create Announcement" : "Edit Announcement"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title *</Label>
              <Input
                id="ann-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title..."
                className="bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="ann-content">Content *</Label>
              <Textarea
                id="ann-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your announcement content..."
                rows={6}
                className="bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 resize-none"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="ann-excerpt">Excerpt (optional)</Label>
              <Textarea
                id="ann-excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Short summary (auto-generated from content if left empty)..."
                rows={2}
                className="bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 resize-none"
              />
            </div>

            {/* Priority & Visibility row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as FormData["priority"] })}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => setFormData({ ...formData, visibility: v })}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              {imagePreview ? (
                <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={imagePreview}
                    alt="Cover preview"
                    className="w-full h-[200px] object-cover rounded-lg"
                  />
                  {/* Upload state overlay */}
                  {uploadState === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                        <span className="text-xs font-medium text-white">Uploading...</span>
                      </div>
                    </div>
                  )}
                  {uploadState === "success" && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 shadow-lg">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      <span className="text-xs font-medium text-white">Uploaded</span>
                    </div>
                  )}
                  {uploadState === "error" && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 shadow-lg">
                      <AlertCircle className="h-4 w-4 text-white" />
                      <span className="text-xs font-medium text-white">Upload failed</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
                    isDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  {uploadState === "uploading" ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Upload className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Click or drag to upload
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF, WebP (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div>
                <Label htmlFor="ann-published" className="cursor-pointer text-sm font-medium">
                  Publish immediately
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Make this announcement visible to the public
                </p>
              </div>
              <Switch
                id="ann-published"
                checked={formData.isPublished}
                onCheckedChange={(v) => setFormData({ ...formData, isPublished: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div>
                <Label htmlFor="ann-pinned" className="cursor-pointer text-sm font-medium">
                  Pin to top
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Show this announcement at the top of the list
                </p>
              </div>
              <Switch
                id="ann-pinned"
                checked={formData.isPinned}
                onCheckedChange={(v) => setFormData({ ...formData, isPinned: v })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="border-gray-200 dark:border-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={openPreview}
              disabled={!formData.title.trim() || !formData.content.trim()}
              className="border-gray-200 dark:border-gray-700 gap-1.5"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={formLoading || !formData.title.trim() || !formData.content.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white shadow-md"
            >
              {formLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : formMode === "create" ? (
                "Create Announcement"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Announcement Preview
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Priority bar */}
            <div className={`h-1 rounded-full ${PRIORITY_CONFIG[formData.priority]?.bar || "bg-blue-500"}`} />

            {/* Cover Image */}
            {imagePreview && (
              <div className="relative w-full overflow-hidden rounded-lg">
                <img
                  src={imagePreview}
                  alt="Cover preview"
                  className="w-full h-[220px] object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={`${PRIORITY_CONFIG[formData.priority]?.bg || ""} ${PRIORITY_CONFIG[formData.priority]?.color || ""} border-0 text-xs font-medium`}>
                {PRIORITY_CONFIG[formData.priority]?.label || "Normal"}
              </Badge>
              {formData.isPublished ? (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                  Published
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-0 text-xs">
                  Draft
                </Badge>
              )}
              {formData.isPinned && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1 text-xs">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-0 gap-1 text-xs">
                {(() => {
                  const visOpt = VISIBILITY_OPTIONS.find(o => o.value === formData.visibility);
                  const VisIcon = visOpt?.icon || Globe;
                  return <><VisIcon className="h-3 w-3" />{visOpt?.label || "Public (Everyone)"}</>;
                })()}
              </Badge>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formData.title || "Untitled Announcement"}
            </h2>

            {/* Author info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  {(session?.user as { firstName?: string })?.firstName?.[0] || "U"}
                </span>
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {(session?.user as { firstName?: string })?.firstName || "User"} {(session?.user as { lastName?: string })?.lastName || ""}
              </span>
              <span>·</span>
              <span>{format(new Date(), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700" />

            {/* Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {formData.content || "No content"}
              </p>
            </div>

            {/* Excerpt */}
            {formData.excerpt && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Excerpt</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  {formData.excerpt}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-gray-200 dark:border-gray-700 gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              Back to Edit
            </Button>
            <Button
              onClick={() => {
                setPreviewOpen(false);
                handleSubmit();
              }}
              disabled={formLoading || !formData.title.trim() || !formData.content.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white shadow-md"
            >
              {formLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {formMode === "create" ? "Publish Now" : "Confirm Changes"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
    </RoleGuard>
  );
}
