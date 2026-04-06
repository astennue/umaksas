"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Minus,
  Pin,
  Search,
  Megaphone,
  Loader2,
  ArrowUpDown,
  X,
  Calendar,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicLayout } from "@/components/public/public-layout";

interface Announcement {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  imageUrl: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: string;
  authorRole?: string | null;
}

type SortOption = "newest" | "oldest" | "recent_update" | "az" | "za";
type TimeFilterOption = "all" | "today" | "week" | "month" | "3months" | "6months" | "year" | "custom";

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; bar: string; icon: React.ReactNode }> = {
  URGENT: { color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", label: "Urgent", bar: "bg-red-500", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  HIGH: { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", label: "High", bar: "bg-orange-500", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  NORMAL: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Normal", bar: "bg-blue-500", icon: <Info className="h-3.5 w-3.5" /> },
  LOW: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800/30", label: "Low", bar: "bg-gray-400 dark:bg-gray-600", icon: <Minus className="h-3.5 w-3.5" /> },
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "az", label: "A-Z" },
  { value: "za", label: "Z-A" },
  { value: "recent_update", label: "Most Recent Update" },
];

const TIME_FILTER_OPTIONS: { value: TimeFilterOption; label: string; icon?: React.ReactNode }[] = [
  { value: "all", label: "All Time", icon: <Clock className="h-3.5 w-3.5" /> },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
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

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const limit = 12;

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAnnouncements = useCallback(async (currentOffset = 0, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentOffset),
        sort: sortBy,
        timeFilter: timeFilter,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (timeFilter === "custom" && startDate) params.set("startDate", startDate);
      if (timeFilter === "custom" && endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/announcements?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      if (append) {
        setAnnouncements((prev) => [...prev, ...data.announcements]);
      } else {
        setAnnouncements(data.announcements);
      }
      setTotal(data.total);
      setHasMore(data.announcements.length + currentOffset < data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sortBy, timeFilter, startDate, endDate]);

  useEffect(() => {
    setOffset(0);
    fetchAnnouncements(0);
  }, [fetchAnnouncements]);

  const loadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchAnnouncements(newOffset, true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("newest");
    setTimeFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const openDetail = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDetailOpen(true);
    // Fetch full detail from API
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/announcements/${announcement.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAnnouncement(data);
      }
    } catch {
      // Keep the list item data as fallback
    } finally {
      setDetailLoading(false);
    }
  };

  const hasActiveFilters = searchQuery || timeFilter !== "all" || ((timeFilter as string) === "custom" && (startDate || endDate));

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden live-gradient hero-fade-bottom bg-gradient-to-br from-[#0a0e27] via-[#0f1b4d] to-[#0d2247]">
        {/* Decorative blurs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/8 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
          <motion.div
            className="absolute -top-20 right-[15%] h-[300px] w-[300px] rounded-full bg-yellow-500/[0.06] dark:bg-yellow-500/[0.08] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-24 left-[20%] h-[280px] w-[280px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, -15, 20, 0], y: [0, 15, -20, 0], scale: [1, 0.92, 1.1, 1] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-4 py-1.5 text-sm font-medium text-yellow-400">
              <Megaphone className="h-4 w-4" />
              Stay Updated
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Announcements
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-yellow-100/70 sm:text-lg">
              Keep up with the latest news, updates, and important notices from the UMak SAS community.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 right-[10%] h-[300px] w-[300px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[40%] -left-16 h-[280px] w-[280px] rounded-full bg-yellow-500/[0.03] dark:bg-yellow-500/[0.05] blur-3xl"
            animate={{ x: [0, -18, 22, 0], y: [0, 18, -12, 0], scale: [1, 0.94, 1.08, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 left-[45%] h-[350px] w-[350px] rounded-full bg-blue-500/[0.03] dark:bg-blue-500/[0.05] blur-3xl"
            animate={{ x: [0, 15, -20, 0], y: [0, -15, 20, 0], scale: [1, 1.08, 0.92, 1] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Search and Filter Bar */}
        <div className="mb-8 space-y-4">
          {/* Row 1: Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search by title/subject */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-12 border-0 shadow-lg bg-white dark:bg-gray-800 rounded-xl text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Time filter */}
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilterOption)}>
              <SelectTrigger className="h-12 text-sm w-full sm:w-[180px] bg-white dark:bg-gray-800 border-0 shadow-lg rounded-xl">
                <Calendar className="w-4 h-4 mr-1.5 text-gray-500" />
                <SelectValue placeholder="Filter by time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-12 text-sm w-full sm:w-[180px] bg-white dark:bg-gray-800 border-0 shadow-lg rounded-xl">
                <ArrowUpDown className="w-4 h-4 mr-1.5 text-gray-500" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range picker */}
          {timeFilter === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col sm:flex-row gap-3 items-end rounded-xl border bg-white p-4 shadow-md dark:bg-gray-800 dark:border-gray-700"
            >
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (startDate || endDate) {
                    setOffset(0);
                    fetchAnnouncements(0);
                  }
                }}
                className="gap-1.5"
              >
                Apply
              </Button>
            </motion.div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {searchQuery && (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 gap-1.5 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 text-xs"
                >
                  Search: &quot;{searchQuery}&quot;
                  <button type="button" onClick={() => setSearchQuery("")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {timeFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 gap-1.5 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800 text-xs"
                >
                  {TIME_FILTER_OPTIONS.find((o) => o.value === timeFilter)?.label}
                  <button type="button" onClick={() => setTimeFilter("all")}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Announcements List */}
        {loading && announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-muted-foreground">Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Announcements</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              {hasActiveFilters
                ? "No announcements match your filters. Try adjusting your search or time range."
                : "There are no announcements at this time. Check back later for updates."}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {/* Results count */}
            <p className="mb-4 text-sm text-muted-foreground">
              Showing {announcements.length} of {total} announcement{total !== 1 ? "s" : ""}
            </p>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {announcements.map((announcement, index) => {
                  const config = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.NORMAL;
                  const displayDate = announcement.publishedAt || announcement.createdAt;

                  return (
                    <motion.div
                      key={announcement.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                    >
                      <div className="shimmer-card group h-full overflow-hidden rounded-xl border-0 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800">
                        {/* Priority bar */}
                        <div className={`h-1.5 ${config.bar}`} />

                        <div className="p-5">
                          {/* Badges */}
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`${config.bg} ${config.color} border-0 gap-1 text-xs font-medium`}
                            >
                              {config.icon}
                              {config.label}
                            </Badge>
                            {announcement.isPinned && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 gap-1 text-xs">
                                <Pin className="h-3 w-3" />
                                Pinned
                              </Badge>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-yellow-700 dark:text-gray-100 dark:group-hover:text-yellow-400 transition-colors">
                            {announcement.title}
                          </h3>

                          {/* Date, Author & Role */}
                          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <time dateTime={displayDate}>
                              {format(new Date(displayDate), "MMM d, yyyy")}
                            </time>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{announcement.author}</span>
                            {getRoleBadge(announcement.authorRole)}
                          </div>

                          {/* Content */}
                          <p className="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            {announcement.excerpt || announcement.content}
                          </p>

                          {/* Read more */}
                          <button
                            type="button"
                            onClick={() => openDetail(announcement)}
                            className="mt-3 inline-flex items-center text-sm font-medium text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                          >
                            Read more
                            <svg className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Announcement Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl border-0 shadow-2xl">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : selectedAnnouncement ? (
            <>
              {selectedAnnouncement.imageUrl && (
                <div className="relative -mx-6 -mt-6 h-[240px] overflow-hidden sm:rounded-t-lg">
                  <img
                    src={selectedAnnouncement.imageUrl}
                    alt={selectedAnnouncement.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}

              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge
                    variant="secondary"
                    className={`${(PRIORITY_CONFIG[selectedAnnouncement.priority] || PRIORITY_CONFIG.NORMAL).bg} ${(PRIORITY_CONFIG[selectedAnnouncement.priority] || PRIORITY_CONFIG.NORMAL).color} border-0 gap-1 text-xs font-medium`}
                  >
                    {(PRIORITY_CONFIG[selectedAnnouncement.priority] || PRIORITY_CONFIG.NORMAL).label}
                  </Badge>
                  {selectedAnnouncement.isPinned && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 gap-1 text-xs">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                  {selectedAnnouncement.title}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <time dateTime={selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt}>
                    {format(new Date(selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </time>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selectedAnnouncement.author}</span>
                  {getRoleBadge(selectedAnnouncement.authorRole)}
                </div>
              </DialogHeader>

              <div className="prose prose-sm dark:prose-invert max-w-none mt-2">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {selectedAnnouncement.content}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
