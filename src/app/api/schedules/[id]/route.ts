import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ScheduleType, ScheduleStatus, UserRole } from "@prisma/client";

// GET /api/schedules/[id] - Get schedule detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const schedule = await db.schedule.findUnique({
      where: { id },
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
            email: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id] - Update schedule / Approve / Reject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { id } = await params;

    const existingSchedule = await db.schedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      type,
      dayOfWeek,
      startTime,
      endTime,
      location,
      officeId,
      semester,
      academicYear,
      notes,
      status,
    } = body;

    // Handle approve/reject actions
    if (status === "APPROVED" || status === "REJECTED") {
      if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(user.role)) {
        return NextResponse.json(
          { error: "Only Super Admin, Adviser, or Officer can approve/reject schedules" },
          { status: 403 }
        );
      }

      const updatedSchedule = await db.schedule.update({
        where: { id },
        data: {
          status: status as ScheduleStatus,
          approvedBy: user.id,
          approvedAt: status === ScheduleStatus.APPROVED ? new Date() : null,
          notes: notes !== undefined ? notes : undefined,
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

      // Create notification for the SA when schedule is approved/rejected
      if (existingSchedule.userId !== user.id) {
        await db.notification.create({
          data: {
            userId: existingSchedule.userId,
            type: status === ScheduleStatus.APPROVED ? "SCHEDULE_APPROVED" : "SYSTEM",
            title: status === ScheduleStatus.APPROVED
              ? "Schedule Approved"
              : "Schedule Rejected",
            message: status === ScheduleStatus.APPROVED
              ? `Your ${existingSchedule.type.toLowerCase()} schedule for ${getDayName(existingSchedule.dayOfWeek)} (${existingSchedule.startTime}-${existingSchedule.endTime}) has been approved.`
              : `Your ${existingSchedule.type.toLowerCase()} schedule for ${getDayName(existingSchedule.dayOfWeek)} (${existingSchedule.startTime}-${existingSchedule.endTime}) has been rejected.${notes ? ` Reason: ${notes}` : ""}`,
            link: "/dashboard/schedules",
          },
        });
      }

      return NextResponse.json(updatedSchedule);
    }

    // Regular update - check permissions
    // STUDENT_ASSISTANT can only update their own pending schedules
    if (user.role === UserRole.STUDENT_ASSISTANT) {
      if (existingSchedule.userId !== user.id) {
        return NextResponse.json(
          { error: "You can only update your own schedules" },
          { status: 403 }
        );
      }
      if (existingSchedule.status !== ScheduleStatus.PENDING) {
        return NextResponse.json(
          { error: "You can only update pending schedules" },
          { status: 403 }
        );
      }
    } else if (!["SUPER_ADMIN", "ADVISER", "OFFICER", "OFFICE_SUPERVISOR"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update schedules" },
        { status: 403 }
      );
    }

    // Validate time format if provided
    if (startTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      return NextResponse.json(
        { error: "startTime must be in HH:MM format (24-hour)" },
        { status: 400 }
      );
    }
    if (endTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      return NextResponse.json(
        { error: "endTime must be in HH:MM format (24-hour)" },
        { status: 400 }
      );
    }

    // Validate endTime after startTime
    const effectiveStartTime = startTime || existingSchedule.startTime;
    const effectiveEndTime = endTime || existingSchedule.endTime;
    if (effectiveStartTime >= effectiveEndTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Check for overlapping schedules (excluding current)
    const effectiveDay = dayOfWeek !== undefined ? dayOfWeek : existingSchedule.dayOfWeek;
    const overlappingSchedules = await db.schedule.findMany({
      where: {
        userId: existingSchedule.userId,
        dayOfWeek: effectiveDay,
        status: { in: [ScheduleStatus.PENDING, ScheduleStatus.APPROVED] },
        id: { not: id },
        OR: [
          { startTime: { lt: effectiveEndTime }, endTime: { gt: effectiveStartTime } },
        ],
      },
    });

    if (overlappingSchedules.length > 0) {
      return NextResponse.json(
        { error: "This schedule conflicts with an existing schedule for this day" },
        { status: 409 }
      );
    }

    const updatedSchedule = await db.schedule.update({
      where: { id },
      data: {
        ...(type !== undefined && { type: type as ScheduleType }),
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(location !== undefined && { location }),
        ...(officeId !== undefined && { officeId }),
        ...(semester !== undefined && { semester }),
        ...(academicYear !== undefined && { academicYear }),
        ...(notes !== undefined && { notes }),
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

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id] - Delete schedule (SUPER_ADMIN, ADVISER only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { id } = await params;

    const existingSchedule = await db.schedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    // STUDENT_ASSISTANT can delete own pending schedules
    if (user.role === UserRole.STUDENT_ASSISTANT) {
      if (existingSchedule.userId !== user.id) {
        return NextResponse.json(
          { error: "You can only delete your own schedules" },
          { status: 403 }
        );
      }
      if (existingSchedule.status !== ScheduleStatus.PENDING) {
        return NextResponse.json(
          { error: "You can only delete pending schedules" },
          { status: 403 }
        );
      }
    } else if (!["SUPER_ADMIN", "ADVISER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin or Adviser can delete schedules" },
        { status: 403 }
      );
    }

    await db.schedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}

function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] || "Unknown";
}
