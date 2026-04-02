import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/attendance/[id] - Get attendance detail
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

    const record = await db.attendanceRecord.findUnique({
      where: { id },
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
        corrections: {
          include: {
            requester: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({
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
      correctedBy: record.correctedBy,
      correctionReason: record.correctionReason,
      correctedAt: record.correctedAt?.toISOString() || null,
      notes: record.notes,
      location: record.location,
      corrections: record.corrections.map((c) => ({
        id: c.id,
        requestedBy: c.requestedBy,
        requesterName: `${c.requester.firstName || ""} ${c.requester.lastName || ""}`.trim(),
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
      })),
    });
  } catch (error) {
    console.error("Error fetching attendance record:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance record" },
      { status: 500 }
    );
  }
}

// Helper to calculate total hours
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

// PUT /api/attendance/[id] - Manual edit (SUPER_ADMIN, ADVISER, HRMO only)
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

    if (!["SUPER_ADMIN", "ADVISER", "HRMO", "OFFICE_SUPERVISOR"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin, Adviser, HRMO, or Office Supervisor can edit attendance" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      timeIn,
      timeOut,
      breakStart,
      breakEnd,
      status,
      notes,
    } = body;

    // Check record exists
    const existing = await db.attendanceRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      isCorrected: true,
      correctedBy: user.id,
      correctedAt: new Date(),
    };

    if (timeIn !== undefined) {
      updateData.timeIn = timeIn ? new Date(timeIn) : null;
    }
    if (timeOut !== undefined) {
      updateData.timeOut = timeOut ? new Date(timeOut) : null;
    }
    if (breakStart !== undefined) {
      updateData.breakStart = breakStart ? new Date(breakStart) : null;
    }
    if (breakEnd !== undefined) {
      updateData.breakEnd = breakEnd ? new Date(breakEnd) : null;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Recalculate total hours if times changed
    if (timeIn !== undefined || timeOut !== undefined || breakStart !== undefined || breakEnd !== undefined) {
      const tIn = timeIn !== undefined ? (timeIn ? new Date(timeIn) : null) : existing.timeIn;
      const tOut = timeOut !== undefined ? (timeOut ? new Date(timeOut) : null) : existing.timeOut;
      const bStart = breakStart !== undefined ? (breakStart ? new Date(breakStart) : null) : existing.breakStart;
      const bEnd = breakEnd !== undefined ? (breakEnd ? new Date(breakEnd) : null) : existing.breakEnd;
      updateData.totalHours = Math.round(calculateTotalHours(tIn, tOut, bStart, bEnd) * 100) / 100;
    }

    const updated = await db.attendanceRecord.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      message: "Attendance record updated successfully",
      record: {
        id: updated.id,
        timeIn: updated.timeIn?.toISOString() || null,
        timeOut: updated.timeOut?.toISOString() || null,
        breakStart: updated.breakStart?.toISOString() || null,
        breakEnd: updated.breakEnd?.toISOString() || null,
        totalHours: updated.totalHours,
        status: updated.status,
        isCorrected: updated.isCorrected,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 }
    );
  }
}
