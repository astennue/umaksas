import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AttendanceStatus, UserRole } from "@prisma/client";

// Helper to calculate total hours (excluding break time)
function calculateTotalHours(
  timeIn: Date | null,
  timeOut: Date | null,
  breakStart: Date | null,
  breakEnd: Date | null
): number {
  if (!timeIn || !timeOut) return 0;
  const totalMs = timeOut.getTime() - timeIn.getTime();
  let breakMs = 0;
  if (breakStart && breakEnd) {
    breakMs = breakEnd.getTime() - breakStart.getTime();
  }
  return Math.max(0, (totalMs - breakMs) / (1000 * 60 * 60));
}

// Helper to get today's day of week (0=Sunday, 1=Monday, ... 6=Saturday)
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// Helper to parse a time string "HH:mm" into hours and minutes
function parseTimeStr(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

// Helper to determine clock-in status based on schedule + grace period
async function determineClockInStatus(
  userId: string,
  clockInTime: Date
): Promise<{ status: AttendanceStatus; scheduledStartTime: string | null; scheduledEndTime: string | null }> {
  const dayOfWeek = getDayOfWeek(clockInTime);

  // Fetch the SA's approved WORK schedule for today's day of week
  const schedule = await db.schedule.findFirst({
    where: {
      userId,
      type: "WORK",
      status: "APPROVED",
      dayOfWeek,
    },
    orderBy: { startTime: "asc" },
  });

  // Fetch system settings for grace period
  const settings = await db.systemSettings.findFirst({
    select: { lateGraceMinutes: true, maxWorkHoursPerDay: true },
  });

  const graceMinutes = settings?.lateGraceMinutes ?? 15;

  if (!schedule) {
    // No schedule found - default to PRESENT (no schedule to compare against)
    return { status: AttendanceStatus.PRESENT, scheduledStartTime: null, scheduledEndTime: null };
  }

  const scheduleStart = parseTimeStr(schedule.startTime);
  const scheduleEnd = parseTimeStr(schedule.endTime);

  // Build scheduled start DateTime for comparison (using clock-in date)
  const scheduledStart = new Date(clockInTime);
  scheduledStart.setHours(scheduleStart.hours, scheduleStart.minutes, 0, 0);

  // Calculate the deadline: schedule_start + grace period
  const deadline = new Date(scheduledStart.getTime() + graceMinutes * 60 * 1000);

  if (clockInTime > deadline) {
    return {
      status: AttendanceStatus.LATE,
      scheduledStartTime: schedule.startTime,
      scheduledEndTime: schedule.endTime,
    };
  }

  return {
    status: AttendanceStatus.PRESENT,
    scheduledStartTime: schedule.startTime,
    scheduledEndTime: schedule.endTime,
  };
}

// Helper to determine clock-out status based on schedule
async function determineClockOutStatus(
  userId: string,
  clockOutTime: Date,
  clockInTime: Date,
  breakStart: Date | null,
  breakEnd: Date | null,
  previousStatus: AttendanceStatus
): Promise<{ status: AttendanceStatus; totalHours: number; paidHours: number }> {
  const totalHours = calculateTotalHours(clockInTime, clockOutTime, breakStart, breakEnd);

  // Fetch system settings
  const settings = await db.systemSettings.findFirst({
    select: { lateGraceMinutes: true, maxWorkHoursPerDay: true },
  });

  const maxWorkHours = settings?.maxWorkHoursPerDay ?? 4;
  const undertimeGraceMinutes = 15; // 15 minutes grace for undertime

  // Get the SA's approved WORK schedule
  const dayOfWeek = getDayOfWeek(clockOutTime);
  const schedule = await db.schedule.findFirst({
    where: {
      userId,
      type: "WORK",
      status: "APPROVED",
      dayOfWeek,
    },
    orderBy: { startTime: "asc" },
  });

  let newStatus = previousStatus;

  if (schedule) {
    const scheduleEnd = parseTimeStr(schedule.endTime);

    // Build scheduled end DateTime for comparison
    const scheduledEnd = new Date(clockOutTime);
    scheduledEnd.setHours(scheduleEnd.hours, scheduleEnd.minutes, 0, 0);

    // Calculate the undertime threshold: schedule_end - 15 minutes
    const undertimeThreshold = new Date(scheduledEnd.getTime() - undertimeGraceMinutes * 60 * 1000);

    // Check for UNDERTIME: clocked out before schedule end - 15 min
    if (clockOutTime < undertimeThreshold && previousStatus !== AttendanceStatus.LATE) {
      newStatus = AttendanceStatus.UNDERTIME;
    }
  }

  // Check for OVERTIME: total work hours exceed max work hours
  if (totalHours > maxWorkHours) {
    newStatus = AttendanceStatus.OVERTIME;
  }

  // Calculate paid hours (capped at max work hours)
  const paidHours = Math.min(totalHours, maxWorkHours);

  return {
    status: newStatus,
    totalHours: Math.round(totalHours * 100) / 100,
    paidHours: Math.round(paidHours * 100) / 100,
  };
}

// GET /api/attendance - List attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";
    const date = searchParams.get("date") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const officeFilter = searchParams.get("office") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    // STUDENT_ASSISTANT can only see their own records
    if (user.role === UserRole.STUDENT_ASSISTANT) {
      where["userId"] = user.id;
    } else if (userId) {
      where["userId"] = userId;
    }

    // Search by SA name
    if (search && user.role !== UserRole.STUDENT_ASSISTANT) {
      where["user"] = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Filter by office
    if (officeFilter && officeFilter !== "all" && user.role !== UserRole.STUDENT_ASSISTANT) {
      const existingUserFilter = where["user"] as Record<string, unknown> | undefined;
      if (existingUserFilter && existingUserFilter.OR) {
        // Merge with existing search filter
        where["user"] = {
          ...existingUserFilter,
          profile: {
            officeId: officeFilter,
          },
        };
      } else {
        where["user"] = {
          profile: {
            officeId: officeFilter,
          },
        };
      }
    }

    if (date) {
      where["date"] = new Date(date);
    }

    if (startDate && endDate) {
      where["date"] = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where["date"] = { gte: new Date(startDate) };
    } else if (endDate) {
      where["date"] = { lte: new Date(endDate) };
    }

    if (status) {
      where["status"] = status as AttendanceStatus;
    }

    const [records, total] = await Promise.all([
      db.attendanceRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profile: {
                select: {
                  office: {
                    select: { id: true, name: true, code: true },
                  },
                  college: true,
                  program: true,
                },
              },
            },
          },
        },
      }),
      db.attendanceRecord.count({ where }),
    ]);

    // Fetch system settings for context
    const systemSettings = await db.systemSettings.findFirst({
      select: { lateGraceMinutes: true, maxWorkHoursPerDay: true },
    });

    const result = records.map((record) => ({
      id: record.id,
      userId: record.userId,
      firstName: record.user.firstName || "",
      lastName: record.user.lastName || "",
      email: record.user.email,
      college: record.user.profile?.college || null,
      program: record.user.profile?.program || null,
      officeName: record.user.profile?.office?.name || null,
      officeCode: record.user.profile?.office?.code || null,
      date: record.date.toISOString(),
      timeIn: record.timeIn?.toISOString() || null,
      timeOut: record.timeOut?.toISOString() || null,
      breakStart: record.breakStart?.toISOString() || null,
      breakEnd: record.breakEnd?.toISOString() || null,
      totalHours: record.totalHours,
      status: record.status,
      isCorrected: record.isCorrected,
      notes: record.notes,
      location: record.location,
    }));

    return NextResponse.json({
      records: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      systemSettings: systemSettings
        ? {
            lateGraceMinutes: systemSettings.lateGraceMinutes,
            maxWorkHoursPerDay: systemSettings.maxWorkHoursPerDay,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}

// POST /api/attendance - Clock in/out
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== UserRole.STUDENT_ASSISTANT) {
      return NextResponse.json(
        { error: "Only student assistants can clock in/out" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, location } = body;

    if (!["clock_in", "clock_out", "break_start", "break_end"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be clock_in, clock_out, break_start, or break_end" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create today's attendance record
    let record = await db.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    // Get the SA profile for office name
    const profile = await db.sAProfile.findUnique({
      where: { userId: user.id },
      include: { office: { select: { name: true } } },
    });

    const officeName = profile?.office?.name || location || "Office";

    if (action === "clock_in") {
      if (record && record.timeIn) {
        return NextResponse.json(
          { error: "Already clocked in today" },
          { status: 400 }
        );
      }

      const now = new Date();

      // Determine status based on the SA's approved WORK schedule
      const { status, scheduledStartTime, scheduledEndTime } = await determineClockInStatus(user.id, now);

      // Build notes with schedule info
      let notes = "";
      if (scheduledStartTime && scheduledEndTime) {
        notes = `Shift: ${scheduledStartTime} - ${scheduledEndTime}`;
      }

      record = await db.attendanceRecord.create({
        data: {
          userId: user.id,
          date: today,
          timeIn: now,
          status,
          notes: notes || null,
          location: location || officeName,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profile: {
                select: {
                  office: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      });

      // Update SA profile
      await db.sAProfile.update({
        where: { userId: user.id },
        data: {
          isOnDuty: true,
          lastClockIn: now,
        },
      });

      return NextResponse.json({
        message: status === AttendanceStatus.LATE
          ? "Clocked in successfully (Late)"
          : "Clocked in successfully",
        record: {
          id: record.id,
          timeIn: record.timeIn?.toISOString(),
          status: record.status,
          location: record.location,
          notes: record.notes,
          scheduledStartTime,
          scheduledEndTime,
        },
      });

    } else if (action === "clock_out") {
      if (!record || !record.timeIn) {
        return NextResponse.json(
          { error: "Not clocked in today" },
          { status: 400 }
        );
      }

      if (record.timeOut) {
        return NextResponse.json(
          { error: "Already clocked out today" },
          { status: 400 }
        );
      }

      const now = new Date();

      // Determine status based on schedule end time and total hours
      const { status, totalHours, paidHours } = await determineClockOutStatus(
        user.id,
        now,
        record.timeIn,
        record.breakStart,
        record.breakEnd,
        record.status
      );

      // Append overtime/undertime note if applicable
      let updatedNotes = record.notes || "";
      if (status === AttendanceStatus.OVERTIME) {
        const maxWorkHours = paidHours; // paidHours is already capped
        updatedNotes = updatedNotes
          ? `${updatedNotes} | Overtime: ${totalHours.toFixed(1)}h total, ${maxWorkHours.toFixed(1)}h paid`
          : `Overtime: ${totalHours.toFixed(1)}h total, ${maxWorkHours.toFixed(1)}h paid`;
      } else if (status === AttendanceStatus.UNDERTIME) {
        updatedNotes = updatedNotes
          ? `${updatedNotes} | Undertime`
          : "Undertime";
      }

      const updated = await db.attendanceRecord.update({
        where: { id: record.id },
        data: {
          timeOut: now,
          totalHours,
          status,
          notes: updatedNotes || null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profile: {
                select: {
                  office: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      });

      // Update SA profile - use paidHours (capped) for increment
      await db.sAProfile.update({
        where: { userId: user.id },
        data: {
          isOnDuty: false,
          lastClockOut: now,
          totalHoursWorked: {
            increment: totalHours,
          },
          hoursThisSemester: {
            increment: totalHours,
          },
        },
      });

      return NextResponse.json({
        message: "Clocked out successfully",
        record: {
          id: updated.id,
          timeIn: updated.timeIn?.toISOString(),
          timeOut: updated.timeOut?.toISOString(),
          totalHours: updated.totalHours,
          paidHours,
          status: updated.status,
          notes: updated.notes,
        },
      });

    } else if (action === "break_start") {
      if (!record || !record.timeIn) {
        return NextResponse.json(
          { error: "Not clocked in today" },
          { status: 400 }
        );
      }

      if (record.timeOut) {
        return NextResponse.json(
          { error: "Already clocked out today" },
          { status: 400 }
        );
      }

      if (record.breakStart) {
        return NextResponse.json(
          { error: "Already on break" },
          { status: 400 }
        );
      }

      const now = new Date();
      const updated = await db.attendanceRecord.update({
        where: { id: record.id },
        data: { breakStart: now },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  office: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        message: "Break started",
        record: {
          id: updated.id,
          breakStart: updated.breakStart?.toISOString(),
          status: updated.status,
        },
      });

    } else if (action === "break_end") {
      if (!record || !record.breakStart) {
        return NextResponse.json(
          { error: "Not on break" },
          { status: 400 }
        );
      }

      if (record.timeOut) {
        return NextResponse.json(
          { error: "Already clocked out" },
          { status: 400 }
        );
      }

      const now = new Date();
      const updated = await db.attendanceRecord.update({
        where: { id: record.id },
        data: { breakEnd: now },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  office: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        message: "Break ended",
        record: {
          id: updated.id,
          breakStart: updated.breakStart?.toISOString(),
          breakEnd: updated.breakEnd?.toISOString(),
          status: updated.status,
        },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing attendance action:", error);
    return NextResponse.json(
      { error: "Failed to process attendance action" },
      { status: 500 }
    );
  }
}
