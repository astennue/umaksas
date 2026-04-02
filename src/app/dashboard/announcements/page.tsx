"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Bell,
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
  AlertTriangle,
  ImagePlus,
  X,
  CheckCircle2,
  Upload,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef, useCallback as useCb } from "react";
import { CRUDToolbar } from "@/components/crud-toolbar";
import { CRUDActions } from "@/components/crud-actions";
import { RoleGuard } from "@/components/auth/role-guard";

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
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; bar: string }> = {
  URGENT: { color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", label: "Urgent", bar: "bg-red-500" },
  HIGH: { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", label: "High", bar: "bg-orange-500" },
  NORMAL: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Normal", bar: "bg-blue-500" },
  LOW: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800/30", label: "Low", bar: "bg-gray-400 dark:bg-gray-600" },
};

const FILTER_TABS = [
  { key: "ALL", label: "All", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "PUBLISHED", label: "Published", icon: <Eye className="h-3.5 w-3.5" /> },
  { key: "DRAFT", label: "Draft", icon: <Archive className="h-3.5 w-3.5" /> },
  { key: "PINNED", label: "Pinned", icon: <Pin className="h-3.5 w-3.5" /> },
];

interface FormData {
  title: string;
  content: string;
  excerpt: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  imageUrl: string;
  isPublished: boolean;
  isPinned: boolean;
}

const emptyForm: FormData = {
  title: "",
  content: "",
  excerpt: "",
  priority: "NORMAL",
  imageUrl: "",
  isPublished: false,
  isPinned: false,
};

export default function DashboardAnnouncementsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "");
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const canApprove = ["SUPER_ADMIN", "ADVISER", "PRESIDENT"].includes(userRole || "");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

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
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q)
      );
    });

  // Image upload handler
  const handleImageUpload = useCb(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      setImagePreview(data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCb((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const removeImage = useCb(() => {
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    setImagePreview("");
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
    });
    setImagePreview(announcement.imageUrl || "");
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
      const body = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || undefined,
        priority: formData.priority,
        imageUrl: formData.imageUrl.trim() || undefined,
        isPublished: formData.isPublished,
        isPinned: formData.isPinned,
      };

      let res: Response;
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(formMode === "create" ? "Announcement created" : "Announcement updated");
      setFormOpen(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save announcement");
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle publish
  const togglePublish = async (announcement: Announcement) => {
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

  // Delete
  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/announcements/${deletingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Announcement deleted");
      setDeleteOpen(false);
      setDeletingId(null);
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    } finally {
      setDeleteLoading(false);
    }
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
          {/* Search moved to CRUDToolbar */}
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-xl border-0 bg-white py-16 shadow-lg dark:bg-gray-800"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <Megaphone className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No Announcements Found
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || activeFilter !== "ALL"
              ? "No announcements match your current filters."
              : "Get started by creating your first announcement."}
          </p>
          {!searchQuery && activeFilter === "ALL" && isAdmin && (
            <Button onClick={openCreate} className="mt-4 bg-blue-700 hover:bg-blue-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Announcement
            </Button>
          )}
        </motion.div>
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
                        </div>

                        {/* Title */}
                        <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                          {announcement.title}
                        </h3>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 min-w-0">
                          <span className="line-clamp-1 max-w-[300px]">{announcement.author}</span>
                          <span>·</span>
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
                              onClick={() => {
                                setDeletingId(announcement.id);
                                setDeleteOpen(true);
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
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
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
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  ) : (
                    <>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Upload className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Click or drag to upload
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF, WebP (max 5MB)
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Announcement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone and the announcement will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 dark:border-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </RoleGuard>
  );
}
