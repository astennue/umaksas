"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Settings,
  Globe,
  LayoutGrid,
  Type,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  GraduationCap,
  ToggleLeft,
  Percent,
  DollarSign,
  Clock,
  Save,
  RefreshCw,
  EyeOff,
  GripVertical,
  CheckSquare,
  ImageIcon,
  Video,
  Heading,
  AlignLeft,
  Hash,
  Calendar,
  Upload,
  ListChecks,
  ChevronDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SavingIndicator } from "@/components/ui/saving-indicator";
import { RoleGuard } from "@/components/auth/role-guard";

// ============================================
// Types
// ============================================

interface CMSContentItem {
  id: string;
  page: string;
  section: string | null;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormFieldItem {
  id: string;
  label: string;
  fieldType: string;
  context: string;
  configJson: string | null;
  isRequired: boolean;
  orderIndex: number;
  section: string | null;
  step: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SystemSettingsData {
  id: string;
  siteName: string;
  siteDescription: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  academicYear: string | null;
  currentSemester: string | null;
  applicationOpen: boolean;
  renewalOpen: boolean;
  maxWorkHoursPerDay: number;
  monthlyPaymentFee: number;
  rubricAcademic: number;
  rubricInterview: number;
  rubricSkills: number;
  rubricCharacter: number;
}

// Field type config
const fieldTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  TEXT: { label: "Text", icon: Type, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  TEXTAREA: { label: "Textarea", icon: AlignLeft, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  NUMBER: { label: "Number", icon: Hash, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  EMAIL: { label: "Email", icon: Mail, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  PHONE: { label: "Phone", icon: Phone, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  DATE: { label: "Date", icon: Calendar, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  SELECT: { label: "Select", icon: ListChecks, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  CHECKBOX: { label: "Checkbox", icon: CheckSquare, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  FILE_UPLOAD: { label: "File Upload", icon: Upload, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  HEADING: { label: "Heading", icon: Heading, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  PARAGRAPH: { label: "Paragraph", icon: AlignLeft, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const FIELD_TYPES = Object.keys(fieldTypeConfig);

const PAGES = ["home", "about", "sa-wall", "apply", "portal-login", "dashboard", "announcements"];

// ============================================
// Loading Skeleton
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Tab 1: Page Content
// ============================================

function PageContentTab() {
  const { data: session } = useSession();
  const [contents, setContents] = useState<CMSContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageFilter, setPageFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CMSContentItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<CMSContentItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CMSContentItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formPage, setFormPage] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const user = session?.user as { role?: string; officerPosition?: string | null } | undefined;
  const userRole = user?.role || "";
  const officerPosition = user?.officerPosition || null;
  const isPresident = userRole === "OFFICER" && officerPosition === "PRESIDENT";
  const canManage = userRole === "SUPER_ADMIN" || userRole === "ADVISER" || isPresident;

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────────
  useKeyboardShortcuts({
    "/": () => {
      const input = document.querySelector<HTMLInputElement>("input[placeholder*='Search content']");
      if (input) input.focus();
    },
  });

  const fetchContents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (pageFilter !== "all") params.set("page", pageFilter);
      const res = await fetch(`/api/cms?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setContents(data.contents || []);
    } catch {
      toast.error("Failed to load CMS content");
    } finally {
      setLoading(false);
    }
  }, [pageFilter]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const resetForm = () => {
    setFormPage("");
    setFormSection("");
    setFormTitle("");
    setFormContent("");
    setFormImageUrl("");
    setFormVideoUrl("");
    setFormOrder(0);
    setFormIsActive(true);
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: CMSContentItem) => {
    setEditItem(item);
    setFormPage(item.page);
    setFormSection(item.section || "");
    setFormTitle(item.title || "");
    setFormContent(item.content || "");
    setFormImageUrl(item.imageUrl || "");
    setFormVideoUrl(item.videoUrl || "");
    setFormOrder(item.order);
    setFormIsActive(item.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formPage || !formTitle) {
      toast.error("Page and title are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        page: formPage,
        section: formSection || null,
        title: formTitle,
        content: formContent || null,
        imageUrl: formImageUrl || null,
        videoUrl: formVideoUrl || null,
        order: formOrder,
        isActive: formIsActive,
      };

      const url = editItem ? `/api/cms/${editItem.id}` : "/api/cms";
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(editItem ? "Content updated" : "Content created");
      setDialogOpen(false);
      resetForm();
      fetchContents();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cms/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Content deactivated");
      setDeleteOpen(false);
      setDeleteItem(null);
      fetchContents();
    } catch {
      toast.error("Failed to delete content");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: CMSContentItem) => {
    setTogglingId(item.id);
    try {
      const res = await fetch(`/api/cms/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      toast.success(item.isActive ? "Content deactivated" : "Content activated");
      fetchContents();
    } catch {
      toast.error("Failed to toggle content");
    } finally {
      setTogglingId(null);
    }
  };

  const handleMove = async (item: CMSContentItem, direction: "up" | "down") => {
    const sorted = [...contents].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swapItem = sorted[swapIdx];
    try {
      await Promise.all([
        fetch(`/api/cms/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: swapItem.order }),
        }),
        fetch(`/api/cms/${swapItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: item.order }),
        }),
      ]);
      fetchContents();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const handleReorder = async (items: CMSContentItem[]) => {
    try {
      const res = await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((item, idx) => ({ id: item.id, order: idx })) }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      fetchContents();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  // Filter and group
  const filtered = contents.filter((c) => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase()) && !c.page.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, CMSContentItem[]>>((acc, item) => {
    const key = item.page;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const activeCount = contents.filter((c) => c.isActive).length;
  const pageCount = Object.keys(grouped).length;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a8a]/10">
            <FileText className="h-5 w-5 text-[#1e3a8a]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Page Content</h2>
            <p className="text-xs text-muted-foreground">
              {contents.length} items across {pageCount} pages • {activeCount} active
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
            <Plus className="mr-2 h-4 w-4" />
            Add Content
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={pageFilter} onValueChange={setPageFilter}>
          <SelectTrigger className="w-[180px]">
            <Globe className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Pages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pages</SelectItem>
            {PAGES.map((p) => (
              <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Groups */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content found"
          description={search || pageFilter !== "all" ? "Try adjusting your filters" : "Add your first content block to get started"}
          action={canManage ? { label: "Add Content", onClick: openCreate, variant: "outline" } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([page, items]) => (
            <Card key={page}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium capitalize">{page}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{items.length} items</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {items
                  .sort((a, b) => a.order - b.order)
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        !item.isActive ? "opacity-60" : ""
                      }`}
                    >
                      {/* Reorder buttons */}
                      {canManage && (
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <button
                            onClick={() => handleMove(item, "up")}
                            disabled={idx === 0}
                            className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(item, "down")}
                            disabled={idx === items.length - 1}
                            className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Image thumbnail */}
                      {item.imageUrl && (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium truncate">{item.title || "Untitled"}</h4>
                          {!item.isActive && (
                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                              <EyeOff className="mr-1 h-3 w-3" /> Inactive
                            </Badge>
                          )}
                          {item.section && (
                            <Badge variant="outline" className="text-xs">{item.section}</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {item.content ? item.content.substring(0, 100) : "No content"}...
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          {item.videoUrl && (
                            <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Video</span>
                          )}
                          <span>Order: {item.order}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => { setPreviewItem(item); setPreviewOpen(true); }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openEdit(item)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => { setDeleteItem(item); setDeleteOpen(true); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {canManage && (
                          <Switch
                            checked={item.isActive}
                            disabled={togglingId === item.id}
                            onCheckedChange={() => handleToggleActive(item)}
                            className="ml-1"
                          />
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Content" : "Add Content"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Page *</Label>
                <Select value={formPage} onValueChange={setFormPage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select page" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGES.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g., hero, features, about"
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Content title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="HTML or markdown content..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={6}
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> Image URL
                </Label>
                <Input
                  placeholder="https://..."
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" /> Video URL
                </Label>
                <Input
                  placeholder="https://..."
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-3 mr-auto">
              <SavingIndicator saving={saving} />
            </div>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formPage || !formTitle}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {saving ? "Saving..." : editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewItem?.title || "Content Preview"}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{previewItem.page}</Badge>
                {previewItem.section && <Badge variant="secondary">{previewItem.section}</Badge>}
                <Badge variant={previewItem.isActive ? "default" : "secondary"}>
                  {previewItem.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {previewItem.imageUrl && (
                <div className="overflow-hidden rounded-lg border">
                  <img src={previewItem.imageUrl} alt={previewItem.title || ""} className="w-full object-cover" />
                </div>
              )}
              {previewItem.content && (
                <div className="prose prose-sm max-w-none dark:prose-invert rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
                  <div dangerouslySetInnerHTML={{ __html: previewItem.content }} />
                </div>
              )}
              {previewItem.videoUrl && (
                <div className="rounded-lg border overflow-hidden">
                  <video controls className="w-full" src={previewItem.videoUrl} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &ldquo;{deleteItem?.title || "this content"}&rdquo;?
              This will hide it from the public site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================
// Tab 2: Form Builder
// ============================================

function FormBuilderTab() {
  const { data: session } = useSession();
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextTab, setContextTab] = useState("APPLICATION");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editField, setEditField] = useState<FormFieldItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteField, setDeleteField] = useState<FormFieldItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formFieldType, setFormFieldType] = useState("TEXT");
  const [formContext, setFormContext] = useState("APPLICATION");
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formSection, setFormSection] = useState("");
  const [formStep, setFormStep] = useState("1");
  const [formPlaceholder, setFormPlaceholder] = useState("");
  const [formOptions, setFormOptions] = useState("");
  const [formConfig, setFormConfig] = useState("");

  const user = session?.user as { role?: string; officerPosition?: string | null } | undefined;
  const userRole = user?.role || "";
  const officerPosition = user?.officerPosition || null;
  const isPresident = userRole === "OFFICER" && officerPosition === "PRESIDENT";
  const canManage = userRole === "SUPER_ADMIN" || userRole === "ADVISER" || isPresident;

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ context: contextTab });
      const res = await fetch(`/api/cms/form-fields?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFields(data.fields || []);
    } catch {
      toast.error("Failed to load form fields");
    } finally {
      setLoading(false);
    }
  }, [contextTab]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const resetForm = () => {
    setFormLabel("");
    setFormFieldType("TEXT");
    setFormContext(contextTab);
    setFormIsRequired(false);
    setFormSection("");
    setFormStep("1");
    setFormPlaceholder("");
    setFormOptions("");
    setFormConfig("");
    setEditField(null);
  };

  const openCreate = () => {
    resetForm();
    setFormContext(contextTab);
    setDialogOpen(true);
  };

  const openEdit = (field: FormFieldItem) => {
    setEditField(field);
    setFormLabel(field.label);
    setFormFieldType(field.fieldType);
    setFormContext(field.context);
    setFormIsRequired(field.isRequired);
    setFormSection(field.section || "");
    setFormStep(field.step?.toString() || "1");

    // Parse config
    let config: Record<string, unknown> = {};
    try {
      config = field.configJson ? JSON.parse(field.configJson) : {};
    } catch {
      config = {};
    }
    setFormPlaceholder((config.placeholder as string) || "");
    setFormOptions(Array.isArray(config.options) ? (config.options as string[]).join("\n") : "");
    setFormConfig(field.configJson || "");

    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formLabel) {
      toast.error("Label is required");
      return;
    }
    setSaving(true);
    try {
      // Build config JSON
      let config: Record<string, unknown> = {};
      if (formPlaceholder) config.placeholder = formPlaceholder;
      if (formOptions && (formFieldType === "SELECT" || formFieldType === "CHECKBOX")) {
        config.options = formOptions.split("\n").map((o) => o.trim()).filter(Boolean);
      }

      const body = {
        label: formLabel,
        fieldType: formFieldType,
        context: formContext,
        isRequired: formIsRequired,
        section: formSection || null,
        step: parseInt(formStep, 10) || 1,
        configJson: Object.keys(config).length > 0 ? config : null,
      };

      const url = editField ? `/api/cms/form-fields/${editField.id}` : "/api/cms/form-fields";
      const method = editField ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(editField ? "Field updated" : "Field created");
      setDialogOpen(false);
      resetForm();
      fetchFields();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteField) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cms/form-fields/${deleteField.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Field deleted");
      setDeleteOpen(false);
      setDeleteField(null);
      fetchFields();
    } catch {
      toast.error("Failed to delete field");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (field: FormFieldItem) => {
    setTogglingId(field.id);
    try {
      const res = await fetch(`/api/cms/form-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !field.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      toast.success(field.isActive ? "Field deactivated" : "Field activated");
      fetchFields();
    } catch {
      toast.error("Failed to toggle field");
    } finally {
      setTogglingId(null);
    }
  };

  const handleMove = async (field: FormFieldItem, direction: "up" | "down") => {
    const sorted = [...fields].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = sorted.findIndex((f) => f.id === field.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swapField = sorted[swapIdx];
    try {
      const res = await fetch("/api/cms/form-fields/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { id: field.id, orderIndex: swapField.orderIndex },
            { id: swapField.id, orderIndex: field.orderIndex },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      fetchFields();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  // Group fields by step/section
  const grouped = fields.reduce<Record<string, FormFieldItem[]>>((acc, field) => {
    const key = field.step ? `Step ${field.step}${field.section ? ` — ${field.section}` : ""}` : (field.section || "Ungrouped");
    if (!acc[key]) acc[key] = [];
    acc[key].push(field);
    return acc;
  }, {});

  const activeCount = fields.filter((f) => f.isActive).length;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a8a]/10">
            <LayoutGrid className="h-5 w-5 text-[#1e3a8a]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Form Builder</h2>
            <p className="text-xs text-muted-foreground">
              {fields.length} fields • {activeCount} active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview Form
          </Button>
          {canManage && (
            <Button onClick={openCreate} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          )}
        </div>
      </div>

      {/* Context Tabs */}
      <Tabs value={contextTab} onValueChange={setContextTab}>
        <TabsList>
          <TabsTrigger value="APPLICATION">Application Form</TabsTrigger>
          <TabsTrigger value="RENEWAL">Renewal Form</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Fields by step */}
      {fields.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No form fields"
          description={`Add fields to build your ${contextTab === "APPLICATION" ? "application" : "renewal"} form`}
          action={canManage ? { label: "Add Field", onClick: openCreate, variant: "outline" } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, groupFields]) => (
            <Card key={group}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{group}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{groupFields.length} fields</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {groupFields
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((field, idx) => {
                    const typeInfo = fieldTypeConfig[field.fieldType] || fieldTypeConfig.TEXT;
                    const Icon = typeInfo.icon;
                    return (
                      <div
                        key={field.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          !field.isActive ? "opacity-60" : ""
                        }`}
                      >
                        {/* Reorder */}
                        {canManage && (
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMove(field, "up")}
                              disabled={idx === 0}
                              className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMove(field, "down")}
                              disabled={idx === groupFields.length - 1}
                              className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Type badge */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${typeInfo.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{field.label}</h4>
                            {field.isRequired && (
                              <span className="text-xs text-red-500 font-medium">*</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <Badge className={`text-xs ${typeInfo.color}`} variant="secondary">
                              {typeInfo.label}
                            </Badge>
                            {!field.isActive && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openEdit(field)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                onClick={() => { setDeleteField(field); setDeleteOpen(true); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {canManage && (
                            <Switch
                              checked={field.isActive}
                              disabled={togglingId === field.id}
                              onCheckedChange={() => handleToggleActive(field)}
                              className="ml-1"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Field Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editField ? "Edit Field" : "Add Field"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  placeholder="Field label"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Type *</Label>
                <Select value={formFieldType} onValueChange={setFormFieldType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{fieldTypeConfig[t]?.label || t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g., Personal Info, Contact"
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Step Number</Label>
                <Input
                  type="number"
                  min="1"
                  value={formStep}
                  onChange={(e) => setFormStep(e.target.value)}
                />
              </div>
            </div>

            {(formFieldType === "TEXT" || formFieldType === "TEXTAREA" || formFieldType === "EMAIL" || formFieldType === "PHONE" || formFieldType === "NUMBER" || formFieldType === "DATE") && (
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  placeholder="Enter placeholder text..."
                  value={formPlaceholder}
                  onChange={(e) => setFormPlaceholder(e.target.value)}
                />
              </div>
            )}

            {(formFieldType === "SELECT" || formFieldType === "CHECKBOX") && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <Textarea
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  value={formOptions}
                  onChange={(e) => setFormOptions(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Advanced Config (JSON)</Label>
              <Textarea
                placeholder='{"minLength": 5, "maxLength": 100}'
                value={formConfig}
                onChange={(e) => setFormConfig(e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={formIsRequired} onCheckedChange={setFormIsRequired} />
              <Label>Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center gap-3 mr-auto">
              <SavingIndicator saving={saving} />
            </div>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formLabel}
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
            >
              {saving ? "Saving..." : editField ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Preview — {contextTab === "APPLICATION" ? "Application" : "Renewal"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {fields.filter((f) => f.isActive).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No active fields to preview</p>
              ) : (
                Object.entries(grouped).map(([group, groupFields]) => (
                  <div key={group}>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">{group}</h3>
                    <div className="space-y-3">
                      {groupFields
                        .filter((f) => f.isActive)
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((field) => (
                          <div key={field.id} className="space-y-1.5">
                            <Label className="text-sm">
                              {field.label}
                              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {field.fieldType === "HEADING" ? (
                              <h4 className="text-base font-semibold">{field.label}</h4>
                            ) : field.fieldType === "PARAGRAPH" ? (
                              <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded p-2">
                                {field.label}
                              </p>
                            ) : field.fieldType === "TEXTAREA" ? (
                              <Textarea placeholder={
                                (() => { try { return JSON.parse(field.configJson || "{}").placeholder || ""; } catch { return ""; } })()
                              } disabled rows={3} />
                            ) : field.fieldType === "SELECT" ? (
                              <Select disabled>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    (() => { try { return JSON.parse(field.configJson || "{}").placeholder || "Select..."; } catch { return "Select..."; } })()
                                  } />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => { try { return JSON.parse(field.configJson || "{}").options || []; } catch { return []; } })().map((opt: string, i: number) => (
                                    <SelectItem key={i} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.fieldType === "CHECKBOX" ? (
                              <div className="flex items-center gap-2">
                                <Checkbox disabled />
                                <span className="text-sm">{field.label}</span>
                              </div>
                            ) : field.fieldType === "FILE_UPLOAD" ? (
                              <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-4">
                                <div className="text-center">
                                  <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                                  <p className="mt-1 text-xs text-muted-foreground">Click or drag to upload</p>
                                </div>
                              </div>
                            ) : field.fieldType === "DATE" ? (
                              <Input type="date" disabled />
                            ) : field.fieldType === "NUMBER" ? (
                              <Input type="number" disabled placeholder={
                                (() => { try { return JSON.parse(field.configJson || "{}").placeholder || ""; } catch { return ""; } })()
                              } />
                            ) : (
                              <Input type={field.fieldType === "EMAIL" ? "email" : field.fieldType === "PHONE" ? "tel" : "text"} disabled placeholder={
                                (() => { try { return JSON.parse(field.configJson || "{}").placeholder || ""; } catch { return ""; } })()
                              } />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete &ldquo;{deleteField?.label}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================
// Tab 3: System Settings
// ============================================

function SystemSettingsTab() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [currentSemester, setCurrentSemester] = useState("");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [maxWorkHoursPerDay, setMaxWorkHoursPerDay] = useState(4);
  const [monthlyPaymentFee, setMonthlyPaymentFee] = useState(20);
  const [rubricAcademic, setRubricAcademic] = useState(25);
  const [rubricInterview, setRubricInterview] = useState(25);
  const [rubricSkills, setRubricSkills] = useState(25);
  const [rubricCharacter, setRubricCharacter] = useState(25);

  const userRole = (session?.user as { role?: string })?.role;
  const canManage = userRole === "SUPER_ADMIN";

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cms/system-settings");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSettings(data);
      // Populate form
      setSiteName(data.siteName || "");
      setSiteDescription(data.siteDescription || "");
      setLogoUrl(data.logoUrl || "");
      setContactEmail(data.contactEmail || "");
      setContactPhone(data.contactPhone || "");
      setContactAddress(data.contactAddress || "");
      setFacebookUrl(data.facebookUrl || "");
      setTwitterUrl(data.twitterUrl || "");
      setInstagramUrl(data.instagramUrl || "");
      setLinkedinUrl(data.linkedinUrl || "");
      setAcademicYear(data.academicYear || "");
      setCurrentSemester(data.currentSemester || "");
      setApplicationOpen(data.applicationOpen);
      setRenewalOpen(data.renewalOpen);
      setMaxWorkHoursPerDay(data.maxWorkHoursPerDay);
      setMonthlyPaymentFee(data.monthlyPaymentFee);
      setRubricAcademic(data.rubricAcademic);
      setRubricInterview(data.rubricInterview);
      setRubricSkills(data.rubricSkills);
      setRubricCharacter(data.rubricCharacter);
    } catch {
      toast.error("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cms/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          siteDescription,
          logoUrl,
          contactEmail,
          contactPhone,
          contactAddress,
          facebookUrl,
          twitterUrl,
          instagramUrl,
          linkedinUrl,
          academicYear,
          currentSemester,
          applicationOpen,
          renewalOpen,
          maxWorkHoursPerDay,
          monthlyPaymentFee,
          rubricAcademic,
          rubricInterview,
          rubricSkills,
          rubricCharacter,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("System settings saved");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const rubricTotal = rubricAcademic + rubricInterview + rubricSkills + rubricCharacter;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a8a]/10">
            <Settings className="h-5 w-5 text-[#1e3a8a]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">System Settings</h2>
            <p className="text-xs text-muted-foreground">Configure application-wide settings</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* General */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} disabled={!canManage} />
            </div>
            <div className="space-y-2">
              <Label>Site Description</Label>
              <Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} disabled={!canManage} rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Logo URL</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} disabled={!canManage} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Contact Email</Label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} disabled={!canManage} type="email" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Contact Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} disabled={!canManage} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Contact Address</Label>
              <Textarea value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} disabled={!canManage} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Social */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Social Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-blue-600"><Facebook className="h-3.5 w-3.5" /> Facebook URL</Label>
                <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} disabled={!canManage} placeholder="https://facebook.com/..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sky-500"><Twitter className="h-3.5 w-3.5" /> Twitter URL</Label>
                <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} disabled={!canManage} placeholder="https://twitter.com/..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-pink-500"><Instagram className="h-3.5 w-3.5" /> Instagram URL</Label>
                <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} disabled={!canManage} placeholder="https://instagram.com/..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-blue-700"><Linkedin className="h-3.5 w-3.5" /> LinkedIn URL</Label>
                <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} disabled={!canManage} placeholder="https://linkedin.com/..." />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Academic Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} disabled={!canManage} placeholder="2025-2026" />
              </div>
              <div className="space-y-2">
                <Label>Current Semester</Label>
                <Input value={currentSemester} onChange={(e) => setCurrentSemester(e.target.value)} disabled={!canManage} placeholder="2nd Semester" />
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Application Period</Label>
                  <p className="text-xs text-muted-foreground">Allow new SA applications</p>
                </div>
                <Switch checked={applicationOpen} onCheckedChange={setApplicationOpen} disabled={!canManage} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Renewal Period</Label>
                  <p className="text-xs text-muted-foreground">Allow SA renewal applications</p>
                </div>
                <Switch checked={renewalOpen} onCheckedChange={setRenewalOpen} disabled={!canManage} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SA Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              SA Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Max Work Hours / Day</Label>
                <Input type="number" min="1" max="12" value={maxWorkHoursPerDay} onChange={(e) => setMaxWorkHoursPerDay(parseInt(e.target.value, 10) || 4)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Monthly Payment Fee (₱)</Label>
                <Input type="number" min="0" step="0.01" value={monthlyPaymentFee} onChange={(e) => setMonthlyPaymentFee(parseFloat(e.target.value) || 0)} disabled={!canManage} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Rubric */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Interview Rubric Weights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs">Academic (%)</Label>
                <Input type="number" min="0" max="100" value={rubricAcademic} onChange={(e) => setRubricAcademic(parseFloat(e.target.value) || 0)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Interview (%)</Label>
                <Input type="number" min="0" max="100" value={rubricInterview} onChange={(e) => setRubricInterview(parseFloat(e.target.value) || 0)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Skills (%)</Label>
                <Input type="number" min="0" max="100" value={rubricSkills} onChange={(e) => setRubricSkills(parseFloat(e.target.value) || 0)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Character (%)</Label>
                <Input type="number" min="0" max="100" value={rubricCharacter} onChange={(e) => setRubricCharacter(parseFloat(e.target.value) || 0)} disabled={!canManage} />
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              rubricTotal === 100
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}>
              {rubricTotal === 100 ? (
                <><CheckSquare className="h-4 w-4" /> Total: {rubricTotal}% — Valid</>
              ) : (
                <><ToggleLeft className="h-4 w-4" /> Total: {rubricTotal}% — Must equal 100%</>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// Main Page
// ============================================

export default function CMSContentPage() {
  const [activeTab, setActiveTab] = useState("content");

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADVISER", "OFFICER"]} presidentOnly>
  <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          CMS / Content
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage website content, form fields, and system settings
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="content" className="gap-1.5">
            <FileText className="h-4 w-4 hidden sm:block" />
            Page Content
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-1.5">
            <LayoutGrid className="h-4 w-4 hidden sm:block" />
            Form Builder
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4 hidden sm:block" />
            System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <PageContentTab />
        </TabsContent>

        <TabsContent value="forms" className="mt-6">
          <FormBuilderTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SystemSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
    </RoleGuard>
  );
}
