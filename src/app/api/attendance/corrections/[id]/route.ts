import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CorrectionStatus, UserRole } from "@prisma/client";

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

// PUT /api/attendance/corrections/[id] - Approve/reject correction
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
        { error: "Only Super Admin, Adviser, HRMO, or Office Supervisor can review corrections" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reviewNotes } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be approve or reject" },
        { status: 400 }
      );
    }

    // Find the correction request
    const correction = await db.attendanceCorrection.findUnique({
      where: { id },
      include: {
        attendance: true,
      },
    });

    if (!correction) {
      return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
    }

    if (correction.status !== CorrectionStatus.PENDING) {
      return NextResponse.json(
        { error: "This correction request has already been reviewed" },
        { status: 400 }
      );
    }

    const now = new Date();
    const newStatus = action === "approve" ? CorrectionStatus.APPROVED : CorrectionStatus.REJECTED;

    // Update correction request
    const updatedCorrection = await db.attendanceCorrection.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedBy: user.id,
        reviewedAt: now,
        reviewNotes: reviewNotes || null,
      },
    });

    // If approved, update the attendance record
    if (action === "approve") {
      const attendance = correction.attendance;
      const updatedData: Record<string, unknown> = {
        isCorrected: true,
        correctedBy: user.id,
        correctedAt: now,
        correctionReason: correction.reason,
      };

      if (correction.requestedTimeIn) {
        updatedData.timeIn = correction.requestedTimeIn;
      }
      if (correction.requestedTimeOut) {
        updatedData.timeOut = correction.requestedTimeOut;
      }
      if (correction.requestedBreakStart !== undefined) {
        updatedData.breakStart = correction.requestedBreakStart;
      }
      if (correction.requestedBreakEnd !== undefined) {
        updatedData.breakEnd = correction.requestedBreakEnd;
      }

      // Recalculate total hours
      const tIn = correction.requestedTimeIn || attendance.timeIn;
      const tOut = correction.requestedTimeOut || attendance.timeOut;
      const bStart = correction.requestedBreakStart ?? attendance.breakStart;
      const bEnd = correction.requestedBreakEnd ?? attendance.breakEnd;
      updatedData.totalHours = Math.round(calculateTotalHours(tIn, tOut, bStart, bEnd) * 100) / 100;

      await db.attendanceRecord.update({
        where: { id: correction.attendanceId },
        data: updatedData,
      });

      // Create notification for the SA
      await db.notification.create({
        data: {
          userId: correction.requestedBy,
          type: "ATTENDANCE_CORRECTED",
          title: "Attendance Correction Approved",
          message: `Your attendance correction request for ${attendance.date.toLocaleDateString()} has been approved.`,
          link: "/dashboard/attendance",
        },
      });
    } else {
      // Create notification for rejection
      await db.notification.create({
        data: {
          userId: correction.requestedBy,
          type: "ATTENDANCE_CORRECTED",
          title: "Attendance Correction Rejected",
          message: `Your attendance correction request for ${correction.attendance.date.toLocaleDateString()} has been rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`,
          link: "/dashboard/attendance",
        },
      });
    }

    return NextResponse.json({
      message: `Correction request ${action}d successfully`,
      correction: {
        id: updatedCorrection.id,
        status: updatedCorrection.status,
        reviewedBy: updatedCorrection.reviewedBy,
        reviewedAt: updatedCorrection.reviewedAt?.toISOString() || null,
        reviewNotes: updatedCorrection.reviewNotes,
      },
    });
  } catch (error) {
    console.error("Error reviewing correction request:", error);
    return NextResponse.json(
      { error: "Failed to review correction request" },
      { status: 500 }
    );
  }
}
