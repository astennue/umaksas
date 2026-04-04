import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ScheduleType, ScheduleStatus, UserRole } from "@prisma/client";

// GET /api/schedules - List schedules with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const semester = searchParams.get("semester") || "";
    const dayOfWeek = searchParams.get("dayOfWeek") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    // STUDENT_ASSISTANT can only see own schedules unless viewing approved
    if (user.role === UserRole.STUDENT_ASSISTANT) {
      where["userId"] = user.id;
    }

    if (userId) {
      where["userId"] = userId;
    }

    if (type && type !== "all") {
      where["type"] = type as ScheduleType;
    }

    if (status && status !== "all") {
      where["status"] = status as ScheduleStatus;
    }

    if (semester) {
      where["semester"] = semester;
    }

    if (dayOfWeek !== "" && dayOfWeek !== "all") {
      where["dayOfWeek"] = parseInt(dayOfWeek, 10);
    }

    const [schedules, total] = await Promise.all([
      db.schedule.findMany({
        where,
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          office: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      db.schedule.count({ where }),
    ]);

    // Stats
    const statsWhere = user.role === UserRole.STUDENT_ASSISTANT
      ? { userId: user.id }
      : {};

    // Get current semester from system settings
    let currentSemester = "2nd Semester";
    try {
      const settings = await db.systemSettings.findFirst({
        select: { currentSemester: true },
      });
      if (settings?.currentSemester) {
        currentSemester = settings.currentSemester;
      }
    } catch {
      // Fallback to default if system settings not available
    }

    const [totalCount, approvedCount, pendingCount, semesterCount] = await Promise.all([
      db.schedule.count({ where: statsWhere }),
      db.schedule.count({ where: { ...statsWhere, status: ScheduleStatus.APPROVED } }),
      db.schedule.count({ where: { ...statsWhere, status: ScheduleStatus.PENDING } }),
      db.schedule.count({
        where: {
          ...statsWhere,
          semester: currentSemester,
        },
      }),
    ]);

    return NextResponse.json({
      schedules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: totalCount,
        approved: approvedCount,
        pending: pendingCount,
        thisSemester: semesterCount,
      },
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Create new schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (!["SUPER_ADMIN", "ADVISER", "OFFICER", "STUDENT_ASSISTANT"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create schedules" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      type,
      dayOfWeek,
      startTime,
      endTime,
      location,
      officeId,
      semester,
      academicYear,
      notes,
    } = body;

    // Validate required fields
    if (type === undefined || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "type, dayOfWeek, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    // Validate dayOfWeek
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Time must be in HH:MM format (24-hour)" },
        { status: 400 }
      );
    }

    // Validate endTime is after startTime
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // STUDENT_ASSISTANT can only create for themselves
    let targetUserId = userId;
    if (user.role === UserRole.STUDENT_ASSISTANT) {
      if (userId && userId !== user.id) {
        return NextResponse.json(
          { error: "Student assistants can only create schedules for themselves" },
          { status: 403 }
        );
      }
      targetUserId = user.id;

      // SAs can only create WORK type schedules
      if (type !== "WORK") {
        return NextResponse.json(
          { error: "Student assistants can only create work schedules" },
          { status: 400 }
        );
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "userId is required for non-SA users" },
        { status: 400 }
      );
    }

    // Validate user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate office exists if provided
    if (officeId) {
      const office = await db.office.findUnique({ where: { id: officeId } });
      if (!office) {
        return NextResponse.json(
          { error: "Office not found" },
          { status: 404 }
        );
      }
    }

    // Get system settings for current semester if not provided
    let scheduleSemester = semester;
    let scheduleAcademicYear = academicYear;
    if (!scheduleSemester || !scheduleAcademicYear) {
      const settings = await db.systemSettings.findFirst();
      if (settings) {
        scheduleSemester = scheduleSemester || settings.currentSemester || undefined;
        scheduleAcademicYear = scheduleAcademicYear || settings.academicYear || undefined;
      }
    }

    // Check for overlapping schedules
    const existingSchedules = await db.schedule.findMany({
      where: {
        userId: targetUserId,
        dayOfWeek,
        status: { in: [ScheduleStatus.PENDING, ScheduleStatus.APPROVED] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });

    if (existingSchedules.length > 0) {
      return NextResponse.json(
        { error: "This schedule conflicts with an existing schedule for this day" },
        { status: 409 }
      );
    }

    const newSchedule = await db.schedule.create({
      data: {
        userId: targetUserId,
        type: type as ScheduleType,
        dayOfWeek,
        startTime,
        endTime,
        location: location || null,
        officeId: officeId || null,
        semester: scheduleSemester || null,
        academicYear: scheduleAcademicYear || null,
        notes: notes || null,
        status: user.role === UserRole.STUDENT_ASSISTANT
          ? ScheduleStatus.PENDING
          : ScheduleStatus.APPROVED,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
