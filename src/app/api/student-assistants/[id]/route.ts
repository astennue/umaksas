import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SAStatus } from "@prisma/client";

// GET /api/student-assistants/[id] - Get SA detail (comprehensive)
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

    const profile = await db.sAProfile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            suffix: true,
            email: true,
            phone: true,
            photoUrl: true,
            isActive: true,
            createdAt: true,
            documents: {
              select: {
                id: true,
                type: true,
                title: true,
                fileUrl: true,
                createdAt: true,
              },
              take: 10,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            phone: true,
            location: true,
            headName: true,
            headEmail: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Student assistant not found" },
        { status: 404 }
      );
    }

    // Date ranges for summaries
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Month start/end for monthly attendance breakdown
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Fetch attendance summary in parallel
    const [
      attendanceCount,
      attendanceRecords,
      recentAttendance,
      allEvaluations,
      application,
      payments,
      schedules,
      monthlyAttendance,
      monthlyHours,
    ] = await Promise.all([
      // Total attendance count
      db.attendanceRecord.count({
        where: { userId: id },
      }),
      // Total hours worked
      db.attendanceRecord.aggregate({
        where: { userId: id },
        _sum: { totalHours: true },
      }),
      // Recent attendance records (last 30 days)
      db.attendanceRecord.findMany({
        where: {
          userId: id,
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "desc" },
        take: 30,
        select: {
          id: true,
          date: true,
          timeIn: true,
          timeOut: true,
          totalHours: true,
          status: true,
          notes: true,
        },
      }),
      // All evaluation records
      db.evaluation.findMany({
        where: { saId: id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 12,
        select: {
          id: true,
          totalScore: true,
          rating: true,
          punctuality: true,
          workQuality: true,
          initiative: true,
          teamwork: true,
          communication: true,
          attitude: true,
          strengths: true,
          improvements: true,
          supervisorComments: true,
          month: true,
          year: true,
          semester: true,
          status: true,
          createdAt: true,
          evaluator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          office: {
            select: {
              name: true,
            },
          },
        },
      }),
      // Application info
      db.application.findFirst({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          currentStep: true,
          interviewScore: true,
          interviewStatus: true,
          totalScore: true,
          rank: true,
          submittedAt: true,
          createdAt: true,
          gwa: true,
        },
      }),
      // Payments
      db.payment.findMany({
        where: { userId: id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 12,
        select: {
          id: true,
          amount: true,
          month: true,
          year: true,
          status: true,
          referenceNumber: true,
          receiptUrl: true,
          createdAt: true,
        },
      }),
      // Current schedules
      db.schedule.findMany({
        where: { userId: id, status: "APPROVED" },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          type: true,
          location: true,
          semester: true,
          academicYear: true,
        },
      }),
      // Monthly attendance breakdown (this month)
      db.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          userId: id,
          date: { gte: monthStart, lte: monthEnd },
        },
        _count: { status: true },
      }),
      // Monthly hours
      db.attendanceRecord.aggregate({
        where: {
          userId: id,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { totalHours: true },
      }),
    ]);

    // Format schedules with day names
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const formattedSchedules = schedules.map((s) => ({
      ...s,
      dayName: dayNames[s.dayOfWeek] || "Unknown",
    }));

    // Monthly attendance breakdown
    const monthlyBreakdown: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0,
      HOLIDAY: 0,
    };
    monthlyAttendance.forEach((record) => {
      monthlyBreakdown[record.status] = record._count.status;
    });
    const totalMonthlyRecords = Object.values(monthlyBreakdown).reduce((a, b) => a + b, 0);
    const monthlyPresentCount = monthlyBreakdown.PRESENT + monthlyBreakdown.LATE + monthlyBreakdown.HALF_DAY;
    const attendanceRate = totalMonthlyRecords > 0
      ? Math.round((monthlyPresentCount / totalMonthlyRecords) * 100)
      : 0;

    // Payment summary
    const totalPaid = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);
    const paidCount = payments.filter((p) => p.status === "PAID").length;
    const unpaidCount = payments.filter((p) => p.status === "UNPAID" || p.status === "PENDING").length;

    // Evaluation summary
    const submittedEvaluations = allEvaluations.filter((e) => e.status === "SUBMITTED");
    const averageScore = submittedEvaluations.length > 0
      ? Math.round((submittedEvaluations.reduce((sum, e) => sum + e.totalScore, 0) / submittedEvaluations.length) * 10) / 10
      : 0;
    const ratingDistribution: Record<string, number> = {};
    submittedEvaluations.forEach((e) => {
      const rating = e.rating || "UNRATED";
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    return NextResponse.json({
      id: profile.userId,
      profileId: profile.id,
      firstName: profile.user.firstName || "",
      lastName: profile.user.lastName || "",
      middleName: profile.user.middleName || "",
      suffix: profile.user.suffix || "",
      email: profile.user.email,
      phone: profile.user.phone,
      photoUrl: profile.user.photoUrl,
      isActive: profile.user.isActive,
      createdAt: profile.user.createdAt,
      studentNumber: profile.studentNumber,
      college: profile.college,
      program: profile.program,
      yearLevel: profile.yearLevel,
      academicYear: profile.academicYear,
      semester: profile.semester,
      employeeId: profile.employeeId,
      status: profile.status,
      archiveReason: profile.archiveReason,
      archiveDate: profile.archiveDate,
      totalHoursWorked: profile.totalHoursWorked,
      hoursThisSemester: profile.hoursThisSemester,
      officeId: profile.officeId,
      office: profile.office,
      isOnDuty: profile.isOnDuty,
      lastClockIn: profile.lastClockIn,
      lastClockOut: profile.lastClockOut,
      dateHired: profile.dateHired,

      // Attendance summary
      attendance: {
        totalRecords: attendanceCount,
        totalHours: attendanceRecords._sum.totalHours || 0,
        recentRecords: recentAttendance,
        monthlyBreakdown,
        monthlyHours: monthlyHours._sum.totalHours || 0,
        attendanceRate,
      },

      // Evaluations
      evaluations: {
        records: allEvaluations.map((e) => ({
          ...e,
          evaluatorName: e.evaluator
            ? `${e.evaluator.firstName} ${e.evaluator.lastName}`
            : "N/A",
          officeName: e.office?.name || "N/A",
        })),
        averageScore,
        ratingDistribution,
      },

      // Application info
      application: application || null,

      // Payments
      payments: {
        records: payments,
        totalPaid,
        paidCount,
        unpaidCount,
      },

      // Schedules
      schedules: formattedSchedules,

      // Documents
      documents: profile.user.documents || [],
    });
  } catch (error) {
    console.error("Error fetching student assistant:", error);
    return NextResponse.json(
      { error: "Failed to fetch student assistant" },
      { status: 500 }
    );
  }
}

// PUT /api/student-assistants/[id] - Update SA
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

    if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin, Adviser, or Officer can update student assistants" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      college,
      program,
      yearLevel,
      officeId,
      status,
      customOffice,
    } = body;

    // Check SA exists
    const existingProfile = await db.sAProfile.findUnique({
      where: { userId: id },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Student assistant not found" },
        { status: 404 }
      );
    }

    // Resolve officeId: customOffice takes precedence over officeId
    let resolvedOfficeId = officeId !== undefined ? officeId : existingProfile.officeId;
    if (customOffice && typeof customOffice === "string" && customOffice.trim()) {
      const trimmedName = customOffice.trim();
      // Generate code from first letters of each word
      const code = trimmedName
        .split(/\s+/)
        .filter(Boolean)
        .map((word: string) => word.charAt(0).toUpperCase())
        .join("");

      // Check if an office with this name already exists
      const existingOffice = await db.office.findFirst({
        where: { name: trimmedName },
      });

      if (existingOffice) {
        resolvedOfficeId = existingOffice.id;
      } else {
        // Create a new office
        const newOffice = await db.office.create({
          data: {
            name: trimmedName,
            code,
          },
        });
        resolvedOfficeId = newOffice.id;
      }
    }

    // Update user and profile
    const updatedProfile = await db.sAProfile.update({
      where: { userId: id },
      data: {
        college: college !== undefined ? college : undefined,
        program: program !== undefined ? program : undefined,
        yearLevel: yearLevel !== undefined ? yearLevel : undefined,
        officeId: resolvedOfficeId,
        status: status !== undefined ? (status as SAStatus) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
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

    // Update user fields
    if (firstName !== undefined || lastName !== undefined || phone !== undefined) {
      await db.user.update({
        where: { id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
        },
      });
    }

    return NextResponse.json({
      id: updatedProfile.userId,
      profileId: updatedProfile.id,
      firstName: updatedProfile.user.firstName || "",
      lastName: updatedProfile.user.lastName || "",
      email: updatedProfile.user.email,
      phone: updatedProfile.user.phone,
      college: updatedProfile.college,
      program: updatedProfile.program,
      yearLevel: updatedProfile.yearLevel,
      status: updatedProfile.status,
      officeId: updatedProfile.officeId,
      officeName: updatedProfile.office?.name || null,
    });
  } catch (error) {
    console.error("Error updating student assistant:", error);
    return NextResponse.json(
      { error: "Failed to update student assistant" },
      { status: 500 }
    );
  }
}

// DELETE /api/student-assistants/[id] - Remove SA (SUPER_ADMIN only)
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

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can remove student assistants" },
        { status: 403 }
      );
    }

    // Check SA exists
    const existingProfile = await db.sAProfile.findUnique({
      where: { userId: id },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Student assistant not found" },
        { status: 404 }
      );
    }

    // Archive instead of hard delete
    await db.sAProfile.update({
      where: { userId: id },
      data: {
        status: SAStatus.ARCHIVED,
        archiveDate: new Date(),
      },
    });

    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Student assistant archived" });
  } catch (error) {
    console.error("Error removing student assistant:", error);
    return NextResponse.json(
      { error: "Failed to remove student assistant" },
      { status: 500 }
    );
  }
}
