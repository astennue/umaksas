"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SelectItem } from "@/components/ui/select";
import { BetterSelect } from "@/components/ui/better-select";
import {
  Search,
  Users,
  ArrowUpDown,
  X,
  Building2,
  GraduationCap,
  UserCircle,
} from "lucide-react";
import { safeJsonParse } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { EmptyState } from "@/components/ui/empty-state";
import { PublicLayout } from "@/components/public/public-layout";
import { SACard, type SACardData } from "@/components/sa-wall/sa-card";
import { SADetailModal } from "@/components/sa-wall/sa-detail-modal";
import { SAFullProfileModal } from "@/components/sa-wall/sa-full-profile-modal";
import { useAttendanceSocket } from "@/hooks/use-attendance-socket";

type SortOption = "name" | "college" | "office";

export default function SAWallPage() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const userRole = (session?.user as { role?: string })?.role || "";
  const isStaffRole = ["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR", "HRMO"].includes(userRole);
  const showProfileButton = isAuthenticated && isStaffRole;

  const [sas, setSas] = useState<SACardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [selectedSA, setSelectedSA] = useState<SACardData | null>(null);
  const [fullProfileSA, setFullProfileSA] = useState<SACardData | null>(null);

  const handleViewFullProfile = useCallback((sa: SACardData) => {
    setFullProfileSA(sa);
  }, []);

  const { isConnected, onDutySAs } = useAttendanceSocket();

  useKeyboardShortcuts({
    "/": () => {
      const searchInput = document.querySelector<HTMLInputElement>("input[placeholder*='Search']");
      searchInput?.focus();
    },
  });

  // Debounce search query to avoid API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch SA data
  const fetchSAs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (collegeFilter !== "all") params.set("college", collegeFilter);
      if (officeFilter !== "all") params.set("office", officeFilter);
      if (genderFilter !== "all") params.set("sex", genderFilter);
      params.set("sort", sortBy);

      const res = await fetch(`/api/sa-wall?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await safeJsonParse<any[]>(res);
      setSas(data);
    } catch (err) {
      console.error("Failed to fetch SAs:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, collegeFilter, officeFilter, genderFilter, sortBy]);

  useEffect(() => {
    fetchSAs();
  }, [fetchSAs]);

  // Merge real-time on-duty status with API data
  const mergedSAs = useMemo(() => {
    return sas.map((sa) => ({
      ...sa,
      isOnDuty: onDutySAs.has(sa.id) || sa.isOnDuty,
    }));
  }, [sas, onDutySAs]);

  // Get unique colleges and offices for filters
  const colleges = useMemo(() => {
    const set = new Set<string>();
    sas.forEach((sa) => {
      if (sa.college) set.add(sa.college);
    });
    return Array.from(set).sort();
  }, [sas]);

  const offices = useMemo(() => {
    const set = new Set<string>();
    sas.forEach((sa) => {
      if (sa.officeName) set.add(sa.officeName);
    });
    return Array.from(set).sort();
  }, [sas]);

  // Stats
  const onDutyCount = mergedSAs.filter((sa) => sa.isOnDuty).length;
  const totalFiltered = mergedSAs.length;
  const uniqueColleges = useMemo(() => {
    const set = new Set<string>();
    sas.forEach((sa) => {
      if (sa.college) set.add(sa.college);
    });
    return set.size;
  }, [sas]);
  const uniqueOffices = useMemo(() => {
    const set = new Set<string>();
    sas.forEach((sa) => {
      if (sa.officeName) set.add(sa.officeName);
    });
    return set.size;
  }, [sas]);
  const genderStats = useMemo(() => {
    let female = 0;
    let male = 0;
    sas.forEach((sa) => {
      if (sa.sex?.toLowerCase() === "female") female++;
      else if (sa.sex?.toLowerCase() === "male") male++;
    });
    return { female, male };
  }, [sas]);

  // Clear all filters
  const hasFilters =
    searchQuery || collegeFilter !== "all" || officeFilter !== "all" || genderFilter !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setCollegeFilter("all");
    setOfficeFilter("all");
    setGenderFilter("all");
  };

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <PublicLayout>
      {/* Hero Banner */}
      <div className="relative live-gradient hero-fade-slate bg-gradient-to-br from-[#0a0e27] via-[#0f1b4d] to-[#0d2247] overflow-hidden">
        {/* Decorative gradient circles */}
        <div className="animate-blob absolute top-10 left-[10%] w-64 h-64 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="animate-blob-delay absolute bottom-10 right-[10%] w-72 h-72 rounded-full bg-yellow-500/10 blur-3xl" />
        <motion.div
          className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-yellow-500/15 dark:bg-yellow-500/10 blur-3xl"
          animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 dark:bg-blue-500/10 blur-3xl"
          animate={{ x: [0, -25, 15, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20">
          <div className="flex flex-col items-center text-center">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Badge className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border-yellow-500/30 px-4 py-1.5 text-sm font-medium">
                <Users className="w-4 h-4 mr-1.5" />
                Student Assistant Directory
              </Badge>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-5"
            >
              <span className="text-white">Student Assistants</span>
              <span className="text-yellow-400">Wall</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-yellow-100/70 text-base sm:text-lg max-w-xl mt-4"
            >
              Browse all active Student Assistants, see who&apos;s currently on
              duty, and explore offices across all colleges.
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center gap-3 sm:gap-5 mt-6 text-yellow-100/70 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
                </span>
                <span>
                  <span className="font-bold text-white">{onDutyCount}</span>{" "}
                  Active SAs
                </span>
              </div>
              <span className="text-yellow-400/50">•</span>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-yellow-300" />
                <span>
                  <span className="font-bold text-white">{uniqueOffices}</span>{" "}
                  Offices
                </span>
              </div>
              <span className="text-yellow-400/50">•</span>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-yellow-300" />
                <span>
                  <span className="font-bold text-white">
                    {uniqueColleges}
                  </span>{" "}
                  Colleges
                </span>
              </div>
              <span className="text-yellow-400/50">·</span>
              <div className="flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-yellow-300" />
                <span>
                  <span className="font-bold text-white">
                    {genderStats.female}
                  </span>{" "}
                  Female
                  <span className="text-yellow-400/50 mx-0.5">·</span>
                  <span className="font-bold text-white">
                    {genderStats.male}
                  </span>{" "}
                  Male
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Page background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/20 to-yellow-50/10 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen">
        {/* Subtle gradient orbs behind filter bar and grid */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 left-[20%] h-[350px] w-[350px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[30%] -right-20 h-[300px] w-[300px] rounded-full bg-yellow-500/[0.04] dark:bg-yellow-500/[0.06] blur-3xl"
            animate={{ x: [0, -18, 22, 0], y: [0, 18, -12, 0], scale: [1, 0.94, 1.08, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 left-[40%] h-[400px] w-[400px] rounded-full bg-yellow-500/[0.03] dark:bg-yellow-500/[0.05] blur-3xl"
            animate={{ x: [0, 15, -20, 0], y: [0, -15, 20, 0], scale: [1, 1.08, 0.92, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* Search & Filter Bar */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
          <div className="glow-border bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  placeholder="Search by name, college, or office..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-lg pl-10 pr-9 bg-white border-yellow-200 focus:border-yellow-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter dropdowns */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <BetterSelect value={collegeFilter} onValueChange={setCollegeFilter} placeholder="All Colleges" className="h-12 w-[170px] border-yellow-200">
                    <SelectItem value="all">All Colleges</SelectItem>
                    {colleges.map((college) => (
                      <SelectItem key={college} value={college}>
                        {college}
                      </SelectItem>
                    ))}
                </BetterSelect>

                <BetterSelect value={officeFilter} onValueChange={setOfficeFilter} placeholder="All Offices" className="h-12 w-[170px] border-yellow-200">
                    <SelectItem value="all">All Offices</SelectItem>
                    {offices.map((office) => (
                      <SelectItem key={office} value={office}>
                        {office}
                      </SelectItem>
                    ))}
                </BetterSelect>

                <BetterSelect value={genderFilter} onValueChange={setGenderFilter} placeholder="All Genders" className="h-12 w-[140px] border-yellow-200">
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                </BetterSelect>

                <BetterSelect
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                  placeholder="Sort by"
                  className="h-12 w-[140px] border-yellow-200"
                >
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                </BetterSelect>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="h-12 text-sm text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 font-medium px-3 py-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {searchQuery && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 gap-1.5 px-2.5 py-1 rounded-full border border-yellow-200 dark:border-yellow-800"
                  >
                    Search: &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery("")}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {collegeFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 gap-1.5 px-2.5 py-1 rounded-full border border-yellow-200 dark:border-yellow-800"
                  >
                    {collegeFilter}
                    <button onClick={() => setCollegeFilter("all")}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {officeFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 gap-1.5 px-2.5 py-1 rounded-full border border-yellow-200 dark:border-yellow-800"
                  >
                    {officeFilter}
                    <button onClick={() => setOfficeFilter("all")}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {genderFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 gap-1.5 px-2.5 py-1 rounded-full border border-yellow-200 dark:border-yellow-800"
                  >
                    {genderFilter === "male" ? "Male" : "Female"}
                    <button onClick={() => setGenderFilter("all")}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Results count */}
            {!loading && (
              <div className="mt-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {totalFiltered}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {totalFiltered}
                  </span>{" "}
                  Student Assistants
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card grid */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading Student Assistants...
                </p>
              </div>
            </div>
          ) : mergedSAs.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Student Assistants found"
              description={hasFilters ? "Try adjusting your search or filter criteria." : "No student assistants have been added yet."}
              action={hasFilters ? { label: "Clear all filters", onClick: clearFilters, variant: "outline" } : undefined}
            />
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {mergedSAs.map((sa, index) => (
                <motion.div key={sa.id} variants={itemVariants}>
                  <SACard
                    sa={sa}
                    index={index}
                    onClick={() => setSelectedSA(sa)}
                    isAuthenticated={showProfileButton}
                    onViewFullProfile={() => handleViewFullProfile(sa)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Footer count */}
          {!loading && mergedSAs.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {totalFiltered} Student Assistant
                {totalFiltered !== 1 ? "s" : ""}
                {onDutyCount > 0 &&
                  ` · ${onDutyCount} currently on duty`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SA Detail Modal */}
      <SADetailModal
        sa={selectedSA}
        open={!!selectedSA}
        onOpenChange={(open) => {
          if (!open) setSelectedSA(null);
        }}
        isAuthenticated={showProfileButton}
        onViewFullProfile={handleViewFullProfile}
      />

      {/* Full Profile Modal */}
      <SAFullProfileModal
        sa={fullProfileSA}
        open={!!fullProfileSA}
        onOpenChange={(open) => {
          if (!open) setFullProfileSA(null);
        }}
      />
    </PublicLayout>
  );
}
