import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { OfficerPosition, Prisma } from "@prisma/client";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADVISER", "OFFICER"];

async function getAuthorName(authorId: string | null): Promise<string> {
  if (!authorId) return "Unknown";
  try {
    const user = await db.user.findUnique({
      where: { id: authorId },
      select: { firstName: true, lastName: true },
    });
    if (!user) return "Unknown";
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
  } catch {
    return "Unknown";
  }
}

function getDateRange(timeFilter: string | null): { gte?: Date; lte?: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (timeFilter) {
    case "today": {
      const startOfDay = new Date(today);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      return { gte: startOfDay, lte: endOfDay };
    }
    case "week": {
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday as start
      startOfWeek.setDate(startOfWeek.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { gte: startOfWeek, lte: endOfWeek };
    }
    case "month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { gte: startOfMonth, lte: endOfMonth };
    }
    case "3months": {
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      return { gte: startDate };
    }
    case "6months": {
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 6);
      startDate.setHours(0, 0, 0, 0);
      return { gte: startDate };
    }
    case "year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { gte: startOfYear };
    }
    default:
      return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const timeFilter = searchParams.get("timeFilter");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = searchParams.get("sort") || "newest";

    // Check if the request is from an authenticated admin
    const session = await getServerSession(authOptions);
    const userRole = session ? (session.user as { role: string }).role : null;
    const isAdmin = session && ADMIN_ROLES.includes(userRole!);

    // Build where clause
    const where: Record<string, unknown> = {
      AND: [] as Prisma.AnnouncementWhereInput[],
    };

    // Search by title
    if (search) {
      (where.AND as Prisma.AnnouncementWhereInput[]).push({
        title: { contains: search },
      });
    }

    // Time filter
    if (timeFilter && timeFilter !== "all" && !startDate) {
      const dateRange = getDateRange(timeFilter);
      if (dateRange.gte || dateRange.lte) {
        const dateFilter: Prisma.AnnouncementWhereInput = {};
        if (dateRange.gte) {
          const existing = (dateFilter as Record<string, unknown>).createdAt || {};
          (dateFilter as Record<string, unknown>).createdAt = { ...existing, gte: dateRange.gte };
        }
        if (dateRange.lte) {
          const existing = (dateFilter as Record<string, unknown>).createdAt || {};
          (dateFilter as Record<string, unknown>).createdAt = { ...existing, lte: dateRange.lte };
        }
        (where.AND as Prisma.AnnouncementWhereInput[]).push(dateFilter);
      }
    }

    // Custom date range
    if (startDate && endDate) {
      (where.AND as Prisma.AnnouncementWhereInput[]).push({
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + "T23:59:59.999Z"),
        },
      });
    } else if (startDate) {
      (where.AND as Prisma.AnnouncementWhereInput[]).push({
        createdAt: { gte: new Date(startDate) },
      });
    } else if (endDate) {
      (where.AND as Prisma.AnnouncementWhereInput[]).push({
        createdAt: { lte: new Date(endDate + "T23:59:59.999Z") },
      });
    }

    // Only published for non-admins, with role-based visibility filtering
    if (!isAdmin) {
      (where.AND as Prisma.AnnouncementWhereInput[]).push({ isPublished: true });
      // Role-based visibility:
      // - STUDENT_ASSISTANT: sees "all" and "sas_only"
      // - OFFICE_SUPERVISOR: sees "all" and "supervisors_only"
      // - Unauthenticated/other: sees only "all"
      if (userRole === "STUDENT_ASSISTANT") {
        (where.AND as Prisma.AnnouncementWhereInput[]).push({
          visibility: { in: ["all", "sas_only"] },
        });
      } else if (userRole === "OFFICE_SUPERVISOR") {
        (where.AND as Prisma.AnnouncementWhereInput[]).push({
          visibility: { in: ["all", "supervisors_only"] },
        });
      } else {
        (where.AND as Prisma.AnnouncementWhereInput[]).push({ visibility: "all" });
      }
    }

    // Build orderBy based on sort parameter
    let orderBy: Prisma.AnnouncementOrderByWithRelationInput;
    switch (sort) {
      case "oldest":
        orderBy = { isPinned: "desc", createdAt: "asc" };
        break;
      case "recent_update":
        orderBy = { isPinned: "desc", updatedAt: "desc" };
        break;
      case "az":
        orderBy = { isPinned: "desc", title: "asc" };
        break;
      case "za":
        orderBy = { isPinned: "desc", title: "desc" };
        break;
      case "newest":
      default:
        orderBy = { isPinned: "desc", createdAt: "desc" };
        break;
    }

    const cleanWhere: Prisma.AnnouncementWhereInput = {};
    if ((where.AND as Prisma.AnnouncementWhereInput[]).length > 0) {
      cleanWhere.AND = (where.AND as Prisma.AnnouncementWhereInput[]);
    }

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where: cleanWhere,
        orderBy,
        take: limit,
        skip: offset,
      }),
      db.announcement.count({ where: cleanWhere }),
    ]);

    // Fetch author names and roles for pending_approval computation
    const authorIds = [...new Set(announcements.map((a) => a.authorId).filter(Boolean) as string[])];
    const authorMap = new Map<string, { name: string; role: string; isPresident: boolean }>();
    if (authorIds.length > 0) {
      const authors = await db.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
      for (const author of authors) {
        authorMap.set(author.id, {
          name: `${author.firstName || ""} ${author.lastName || ""}`.trim() || "Unknown",
          role: author.role,
          isPresident: false,
        });
      }
      // Check president status for officer authors
      const officerIds = authors.filter(a => a.role === "OFFICER").map(a => a.id);
      if (officerIds.length > 0) {
        const officerProfiles = await db.officerProfile.findMany({
          where: { userId: { in: officerIds } },
          select: { userId: true, position: true },
        });
        for (const profile of officerProfiles) {
          const entry = authorMap.get(profile.userId);
          if (entry && profile.position === OfficerPosition.PRESIDENT) {
            entry.isPresident = true;
          }
        }
      }
    }

    return NextResponse.json({
      announcements: announcements.map((a) => {
        const authorInfo = a.authorId ? authorMap.get(a.authorId) : null;
        // An announcement is pending approval if: not published AND author is a non-president OFFICER
        const pendingApproval = !a.isPublished && authorInfo?.role === "OFFICER" && !authorInfo.isPresident;
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          excerpt: a.excerpt,
          imageUrl: a.imageUrl,
          priority: a.priority,
          isPublished: a.isPublished,
          isPinned: a.isPinned,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          author: authorInfo?.name || "Unknown",
          visibility: a.visibility,
          ...(pendingApproval ? { status: "pending_approval" } : {}),
        };
      }),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC: SUPER_ADMIN, ADVISER, PRESIDENT_OFFICER can create directly
    // Other OFFICERs can create but with isPublished: false (pending approval)
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;

    const body = await request.json();
    const { title, content, excerpt, priority, imageUrl, isPublished, isPinned, visibility } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required." },
        { status: 400 }
      );
    }

    // Check if OFFICER is PRESIDENT (can create directly)
    let isPresidentOfficer = false;
    if (user.role === "OFFICER") {
      const officerProfile = await db.officerProfile.findUnique({
        where: { userId: user.id },
      });
      isPresidentOfficer = officerProfile?.position === OfficerPosition.PRESIDENT;
    }

    // Non-president OFFICERs cannot publish directly — force pending approval
    const canPublishDirectly = user.role === "SUPER_ADMIN" || user.role === "ADVISER" || isPresidentOfficer;
    const effectiveIsPublished = canPublishDirectly ? (isPublished ?? false) : false;

    // Only SUPER_ADMIN, ADVISER, and PRESIDENT can pin announcements
    const canPin = user.role === "SUPER_ADMIN" || user.role === "ADVISER" || isPresidentOfficer;
    const effectiveIsPinned = canPin ? (isPinned ?? false) : false;

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        excerpt: excerpt || null,
        priority: priority || "NORMAL",
        imageUrl: imageUrl || null,
        isPublished: effectiveIsPublished,
        isPinned: effectiveIsPinned,
        publishedAt: effectiveIsPublished ? new Date() : null,
        authorId: user.id,
        visibility: visibility || "all",
      },
    });

    const authorName = await getAuthorName(announcement.authorId);

    return NextResponse.json(
      {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        excerpt: announcement.excerpt,
        imageUrl: announcement.imageUrl,
        priority: announcement.priority,
        isPublished: announcement.isPublished,
        isPinned: announcement.isPinned,
        publishedAt: announcement.publishedAt,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
        author: authorName,
        authorRole: user.role,
        visibility: announcement.visibility,
        ...(user.role === "OFFICER" && !isPresidentOfficer ? { status: "pending_approval" } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
