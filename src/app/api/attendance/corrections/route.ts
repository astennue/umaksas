import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CorrectionStatus, UserRole } from "@prisma/client";

// GET /api/attendance/corrections - List correction requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const userId = searchParams.get("userId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};

    // STUDENT_ASSISTANT can only see their own correction requests
    if (user.role === UserRole.STUDENT_ASSISTANT) {
      where["requestedBy"] = user.id;
    } else if (userId) {
      where["requestedBy"] = userId;
    }

    if (status) {
      where["status"] = status as CorrectionStatus;
    }

    const [corrections, total] = await Promise.all([
      db.attendanceCorrection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          attendance: {
            select: {
              id: true,
              date: true,
              timeIn: true,
              timeOut: true,
              totalHours: true,
              status: true,
            },
          },
          requester: {
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
                },
              },
            },
          },
        },
      }),
      db.attendanceCorrection.count({ where }),
    ]);

    const result = corrections.map((c) => ({
      id: c.id,
      attendanceId: c.attendanceId,
      date: c.attendance.date.toISOString(),
      currentTimeIn: c.attendance.timeIn?.toISOString() || null,
      currentTimeOut: c.attendance.timeOut?.toISOString() || null,
      currentTotalHours: c.attendance.totalHours,
      currentStatus: c.attendance.status,
      requestedBy: c.requestedBy,
      requesterName: `${c.requester.firstName || ""} ${c.requester.lastName || ""}`.trim(),
      requesterEmail: c.requester.email,
      officeName: c.requester.profile?.office?.name || null,
      requestedTimeIn: c.requestedTimeIn?.toISOString() || null,
      requestedTimeOut: c.requestedTimeOut?.toISOString() || null,
      requestedBreakStart: c.requestedBreakStart?.toISOString() || null,
      requestedBreakEnd: c.requestedBreakEnd?.toISOString() || null,
      reason: c.reason,
      status: c.status,
      reviewedBy: c.reviewedBy,
      reviewedAt: c.reviewedAt?.toISOString() || null,
      reviewNotes: c.reviewNotes,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({
      corrections: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching correction requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch correction requests" },
      { status: 500 }
    );
  }
}

// POST /api/attendance/corrections - Create correction request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (user.role !== UserRole.STUDENT_ASSISTANT) {
      return NextResponse.json(
        { error: "Only student assistants can request corrections" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      attendanceId,
      requestedTimeIn,
      requestedTimeOut,
      requestedBreakStart,
      requestedBreakEnd,
      reason,
    } = body;

    if (!attendanceId || !reason) {
      return NextResponse.json(
        { error: "attendanceId and reason are required" },
        { status: 400 }
      );
    }

    // Verify the attendance record belongs to the user
    const attendance = await db.attendanceRecord.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    if (attendance.userId !== user.id) {
      return NextResponse.json(
        { error: "Cannot request correction for another user's record" },
        { status: 403 }
      );
    }

    // Check for existing pending correction
    const existingPending = await db.attendanceCorrection.findFirst({
      where: {
        attendanceId,
        requestedBy: user.id,
        status: CorrectionStatus.PENDING,
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending correction request for this record" },
        { status: 400 }
      );
    }

    const correction = await db.attendanceCorrection.create({
      data: {
        attendanceId,
        requestedBy: user.id,
        requestedTimeIn: requestedTimeIn ? new Date(requestedTimeIn) : null,
        requestedTimeOut: requestedTimeOut ? new Date(requestedTimeOut) : null,
        requestedBreakStart: requestedBreakStart ? new Date(requestedBreakStart) : null,
        requestedBreakEnd: requestedBreakEnd ? new Date(requestedBreakEnd) : null,
        reason,
      },
      include: {
        attendance: {
          select: {
            id: true,
            date: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Correction request submitted",
        correction: {
          id: correction.id,
          attendanceId: correction.attendanceId,
          date: correction.attendance.date,
          requestedTimeIn: correction.requestedTimeIn?.toISOString() || null,
          requestedTimeOut: correction.requestedTimeOut?.toISOString() || null,
          reason: correction.reason,
          status: correction.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating correction request:", error);
    return NextResponse.json(
      { error: "Failed to create correction request" },
      { status: 500 }
    );
  }
}
