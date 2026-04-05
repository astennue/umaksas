import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApplicationStatus, InterviewStatus, PaymentStatus, CollectionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/stats
 *
 * Returns all dashboard statistics in a single optimized call.
 * Uses efficient Prisma count() queries instead of fetching full records.
 * Returns role-specific data to minimize payload.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const userRole = (session.user as { role: string }).role;
    const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADVISER";
    const isOfficer = userRole === "OFFICER";
    const isSA = userRole === "STUDENT_ASSISTANT";

    // ── 1. Core stats (count-only queries, run in parallel) ──────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalSAs,
      activeSAs,
      onDutySAs,
      totalApplications,
      pendingApplications,
      scheduledInterviews,
      completedInterviews,
      totalOffices,
    ] = await Promise.all([
      // Total SAs (includes OFFICER role since officers are also SAs in this system)
      db.sAProfile.count(),
      // Active SAs
      db.sAProfile.count({ where: { status: "ACTIVE" } }),
      // On-duty SAs: attendance records with timeIn today and no timeOut
      db.attendanceRecord.count({
        where: {
          timeIn: { gte: todayStart, lte: todayEnd },
          timeOut: null,
        },
      }),
      // Total applications (exclude drafts)
      db.application.count({
        where: { status: { not: ApplicationStatus.DRAFT } },
      }),
      // Pending applications (submitted or under review)
      db.application.count({
        where: {
          status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] },
        },
      }),
      // Scheduled interviews (not cancelled/no-show)
      db.interviewSlot.count({
        where: {
          status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.ACCEPTED] },
        },
      }),
      // Completed interviews
      db.interviewSlot.count({
        where: { status: InterviewStatus.COMPLETED },
      }),
      // Total active offices
      db.office.count(),
    ]);

    const stats = {
      totalSAs,
      activeSAs,
      onDutySAs,
      totalApplications,
      pendingApplications,
      scheduledInterviews,
      completedInterviews,
      totalOffices,
    };

    // ── 2. On-duty SA list (only for OFFICER / ADMIN roles) ─────────────────
    let onDutySAList: Array<{
      id: string;
      firstName: string;
      lastName: string;
      officeName: string | null;
      college: string | null;
      lastClockIn: Date | null;
    }> = [];

    if (!isSA) {
      const onDutyRecords = await db.attendanceRecord.findMany({
        where: {
          timeIn: { gte: todayStart, lte: todayEnd },
          timeOut: null,
        },
        select: {
          id: true,
          timeIn: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  college: true,
                  office: {
                    select: { name: true },
                  },
                  lastClockIn: true,
                },
              },
            },
          },
        },
        take: 6,
      });

      onDutySAList = onDutyRecords.map((record) => ({
        id: record.user.id,
        firstName: record.user.firstName || "",
        lastName: record.user.lastName || "",
        officeName: record.user.profile?.office?.name ?? null,
        college: record.user.profile?.college ?? null,
        lastClockIn: record.user.profile?.lastClockIn ?? record.timeIn ?? null,
      }));
    }

    // ── 3. Announcements (all authenticated users) ───────────────────────────
    const recentAnnouncements = await db.announcement.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        createdAt: true,
        priority: true,
        isPinned: true,
      },
      orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    // ── 4. Collection stats (OFFICER / ADMIN only) ──────────────────────────
    let collectionStats = {
      activeCollections: 0,
      totalCollected: 0,
      pendingVerification: 0,
    };

    if (!isSA) {
      const [
        activeCollections,
        paidAgg,
        pendingCount,
      ] = await Promise.all([
        // Active collections count
        db.paymentCollection.count({
          where: { status: CollectionStatus.ACTIVE },
        }),
        // Sum of all paid collection payments
        db.collectionPayment.aggregate({
          where: {
            status: PaymentStatus.PAID,
          },
          _sum: { amountPaid: true, amount: true },
        }),
        // Count of pending verification payments
        db.collectionPayment.count({
          where: {
            status: PaymentStatus.PENDING,
          },
        }),
      ]);

      collectionStats = {
        activeCollections,
        totalCollected: paidAgg._sum.amountPaid ?? paidAgg._sum.amount ?? 0,
        pendingVerification: pendingCount,
      };
    }

    // ── 5. SA self-status (STUDENT_ASSISTANT only) ──────────────────────────
    let saStatus = null;

    if (isSA) {
      const profile = await db.sAProfile.findUnique({
        where: { userId },
        select: {
          isOnDuty: true,
          hoursThisSemester: true,
          totalHoursWorked: true,
          lastClockIn: true,
          office: {
            select: { name: true },
          },
        },
      });

      if (profile) {
        saStatus = {
          isOnDuty: profile.isOnDuty,
          hoursThisSemester: profile.hoursThisSemester,
          totalHoursWorked: profile.totalHoursWorked,
          officeName: profile.office?.name ?? null,
          lastClockIn: profile.lastClockIn,
        };
      }
    }

    // ── Build response ───────────────────────────────────────────────────────
    return NextResponse.json({
      stats,
      onDutySAs: onDutySAList,
      recentAnnouncements,
      collectionStats,
      saStatus,
    });
  } catch (error) {
    console.error("[Dashboard Stats API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 },
    );
  }
}
