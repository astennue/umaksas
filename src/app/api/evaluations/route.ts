import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  EvaluationRating,
  EvaluationStatus,
  UserRole,
} from "@prisma/client";

// GET /api/evaluations - List evaluations
// RBAC: SUPER_ADMIN, ADVISER, OFFICER can view all
// OFFICE_SUPERVISOR can only see evaluations for SAs in their office
// STUDENT_ASSISTANT cannot access evaluations API
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole([
      UserRole.SUPER_ADMIN,
      UserRole.ADVISER,
      UserRole.OFFICER,
      UserRole.OFFICE_SUPERVISOR,
    ]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const saId = searchParams.get("saId") || "";
    const evaluatorId = searchParams.get("evaluatorId") || "";
    const month = searchParams.get("month") || "";
    const year = searchParams.get("year") || "";
    const status = searchParams.get("status") || "";
    const rating = searchParams.get("rating") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};

    if (saId) where["saId"] = saId;
    if (evaluatorId) where["evaluatorId"] = evaluatorId;
    if (month) where["month"] = parseInt(month, 10);
    if (year) where["year"] = parseInt(year, 10);
    if (status && status !== "all") where["status"] = status;
    if (rating && rating !== "all") where["rating"] = rating;

    // RBAC: OFFICE_SUPERVISOR can only see evaluations for SAs in their office
    if (user.role === "OFFICE_SUPERVISOR") {
      const supervisedOffice = await db.office.findFirst({
        where: { headUserId: user.id },
        select: { id: true },
      });
      if (supervisedOffice) {
        where["officeId"] = supervisedOffice.id;
      } else {
        // No supervised office — return empty results
        return NextResponse.json({
          evaluations: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
      }
    }

    if (search) {
      const searchClauses = [
        { sa: { firstName: { contains: search } } },
        { sa: { lastName: { contains: search } } },
        { evaluator: { firstName: { contains: search } } },
        { evaluator: { lastName: { contains: search } } },
        { office: { name: { contains: search } } },
      ];
      if (where["OR"]) {
        where["AND"] = where["AND"] || [];
        (where["AND"] as Record<string, unknown>[]).push({ OR: searchClauses });
      } else {
        where["OR"] = searchClauses;
      }
    }

    const [evaluations, total] = await Promise.all([
      db.evaluation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sa: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              email: true,
              photoUrl: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  studentNumber: true,
                },
              },
            },
          },
          evaluator: {
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
      db.evaluation.count({ where }),
    ]);

    const MONTHS = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const result = evaluations.map((ev) => ({
      id: ev.id,
      saId: ev.saId,
      saName: `${ev.sa.firstName || ""} ${ev.sa.lastName || ""}`.trim(),
      saEmail: ev.sa.email,
      saPhotoUrl: ev.sa.photoUrl,
      saCollege: ev.sa.profile?.college || null,
      saProgram: ev.sa.profile?.program || null,
      saStudentNumber: ev.sa.profile?.studentNumber || null,
      evaluatorId: ev.evaluatorId,
      evaluatorName: `${ev.evaluator.firstName || ""} ${ev.evaluator.lastName || ""}`.trim(),
      evaluatorEmail: ev.evaluator.email,
      evaluatorRole: ev.evaluator.role,
      officeId: ev.officeId,
      officeName: ev.office?.name || null,
      officeCode: ev.office?.code || null,
      month: ev.month,
      monthName: MONTHS[ev.month - 1] || "Unknown",
      year: ev.year,
      semester: ev.semester,
      academicYear: ev.academicYear,
      punctuality: ev.punctuality,
      workQuality: ev.workQuality,
      initiative: ev.initiative,
      teamwork: ev.teamwork,
      communication: ev.communication,
      attitude: ev.attitude,
      totalScore: ev.totalScore,
      rating: ev.rating,
      strengths: ev.strengths,
      improvements: ev.improvements,
      supervisorComments: ev.supervisorComments,
      status: ev.status,
      isLocked: ev.isLocked,
      lockedAt: ev.lockedAt?.toISOString() || null,
      supervisorSignedAt: ev.supervisorSignedAt?.toISOString() || null,
      hrVerifiedAt: ev.hrVerifiedAt?.toISOString() || null,
      createdAt: ev.createdAt.toISOString(),
      updatedAt: ev.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      evaluations: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}

// POST /api/evaluations - Create evaluation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (
      ![
        "SUPER_ADMIN",
        "ADVISER",
        "OFFICER",
        "OFFICE_SUPERVISOR",
      ].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "You do not have permission to create evaluations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      saId,
      evaluatorId,
      officeId,
      month,
      year,
      semester,
      academicYear,
      punctuality,
      workQuality,
      initiative,
      teamwork,
      communication,
      attitude,
      strengths,
      improvements,
      supervisorComments,
      comments,
      totalScore: providedTotalScore,
      rating: providedRating,
    } = body;

    // Validate required fields
    if (!saId || !month || !year) {
      return NextResponse.json(
        { error: "saId, month, and year are required" },
        { status: 400 }
      );
    }

    // Validate score ranges (1-5 scale or 0-10 legacy)
    const scores = { punctuality, workQuality, initiative, teamwork, communication, attitude };
    for (const [key, val] of Object.entries(scores)) {
      if (typeof val !== "number" || val < 0 || val > 10) {
        return NextResponse.json(
          { error: `${key} must be a number between 0 and 10` },
          { status: 400 }
        );
      }
    }

    // Validate month range
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: "month must be between 1 and 12" },
        { status: 400 }
      );
    }

    // Check SA exists
    const saUser = await db.user.findUnique({
      where: { id: saId },
      select: { id: true, role: true },
    });

    if (!saUser || saUser.role !== "STUDENT_ASSISTANT") {
      return NextResponse.json(
        { error: "Invalid student assistant" },
        { status: 400 }
      );
    }

    // For OFFICE_SUPERVISOR, verify the SA is assigned to their office
    if (user.role === "OFFICE_SUPERVISOR" && officeId) {
      const supervisedOffice = await db.office.findFirst({
        where: { headUserId: user.id },
        select: { id: true },
      });
      if (!supervisedOffice || supervisedOffice.id !== officeId) {
        return NextResponse.json(
          { error: "You can only evaluate SAs assigned to your office" },
          { status: 403 }
        );
      }
    }

    // Check for unique constraint
    const existing = await db.evaluation.findUnique({
      where: {
        saId_evaluatorId_month_year: {
          saId,
          evaluatorId: evaluatorId || user.id,
          month,
          year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An evaluation already exists for this SA, evaluator, month, and year" },
        { status: 409 }
      );
    }

    // Calculate total score and rating
    // If totalScore and rating are provided (1-5 scale), use them directly
    // Otherwise, compute from individual scores (legacy 0-10 scale)
    const computedTotalScore =
      (punctuality || 0) +
      (workQuality || 0) +
      (initiative || 0) +
      (teamwork || 0) +
      (communication || 0) +
      (attitude || 0);

    const totalScore = typeof providedTotalScore === "number" ? providedTotalScore : computedTotalScore;

    let rating: EvaluationRating;
    if (providedRating && Object.values(EvaluationRating).includes(providedRating as EvaluationRating)) {
      rating = providedRating as EvaluationRating;
    } else if (totalScore <= 30) {
      // 1-5 scale: max 30
      if (totalScore >= 25) rating = EvaluationRating.OUTSTANDING;
      else if (totalScore >= 19) rating = EvaluationRating.VERY_SATISFACTORY;
      else if (totalScore >= 13) rating = EvaluationRating.SATISFACTORY;
      else if (totalScore >= 7) rating = EvaluationRating.FAIR;
      else rating = EvaluationRating.POOR;
    } else {
      // Legacy 0-10 scale: max 60
      const percentage = (totalScore / 60) * 100;
      if (percentage >= 90) rating = EvaluationRating.EXCELLENT;
      else if (percentage >= 80) rating = EvaluationRating.OUTSTANDING;
      else if (percentage >= 70) rating = EvaluationRating.VERY_SATISFACTORY;
      else if (percentage >= 60) rating = EvaluationRating.SATISFACTORY;
      else if (percentage >= 50) rating = EvaluationRating.FAIR;
      else rating = EvaluationRating.POOR;
    }

    // Create evaluation
    const evaluation = await db.evaluation.create({
      data: {
        saId,
        evaluatorId: evaluatorId || user.id,
        officeId: officeId || null,
        month,
        year,
        semester: semester || null,
        academicYear: academicYear || null,
        punctuality: punctuality || 0,
        workQuality: workQuality || 0,
        initiative: initiative || 0,
        teamwork: teamwork || 0,
        communication: communication || 0,
        attitude: attitude || 0,
        totalScore,
        rating,
        strengths: strengths || null,
        improvements: improvements || null,
        supervisorComments: supervisorComments || comments || null,
        status: EvaluationStatus.DRAFT,
      },
      include: {
        sa: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        evaluator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        office: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: evaluation.id,
        message: "Evaluation created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to create evaluation" },
      { status: 500 }
    );
  }
}
