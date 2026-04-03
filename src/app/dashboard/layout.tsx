"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const collapsed = useSidebarStore((s) => s.collapsed);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/portal-login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <p className="text-sm text-muted-foreground mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <DashboardSidebar />

      {/* Main content area - offset by sidebar width on desktop */}
      <div className={cn(
        "flex min-h-screen flex-col transition-all duration-300",
        // Desktop: offset by sidebar width
        "lg:ml-64",
        collapsed && "lg:ml-[68px]"
      )}>
        <OfflineBanner />
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
