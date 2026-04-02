import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EvaluationRating, EvaluationStatus } from "@prisma/client";

// GET /api/evaluations/[id] - Get evaluation detail
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

    const evaluation = await db.evaluation.findUnique({
      where: { id },
      include: {
        sa: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            phone: true,
            photoUrl: true,
            profile: {
              select: {
                college: true,
                program: true,
                studentNumber: true,
                yearLevel: true,
                officeId: true,
                status: true,
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
            phone: true,
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
            location: true,
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    const MONTHS = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    return NextResponse.json({
      id: evaluation.id,
      saId: evaluation.saId,
      saName: `${evaluation.sa.firstName || ""} ${evaluation.sa.lastName || ""}`.trim(),
      saEmail: evaluation.sa.email,
      saPhone: evaluation.sa.phone,
      saPhotoUrl: evaluation.sa.photoUrl,
      saCollege: evaluation.sa.profile?.college || null,
      saProgram: evaluation.sa.profile?.program || null,
      saStudentNumber: evaluation.sa.profile?.studentNumber || null,
      saYearLevel: evaluation.sa.profile?.yearLevel || null,
      evaluatorId: evaluation.evaluatorId,
      evaluatorName: `${evaluation.evaluator.firstName || ""} ${evaluation.evaluator.lastName || ""}`.trim(),
      evaluatorEmail: evaluation.evaluator.email,
      evaluatorRole: evaluation.evaluator.role,
      evaluatorPhone: evaluation.evaluator.phone,
      officeId: evaluation.officeId,
      officeName: evaluation.office?.name || null,
      officeCode: evaluation.office?.code || null,
      officeEmail: evaluation.office?.email || null,
      officeLocation: evaluation.office?.location || null,
      month: evaluation.month,
      monthName: MONTHS[evaluation.month - 1] || "Unknown",
      year: evaluation.year,
      semester: evaluation.semester,
      academicYear: evaluation.academicYear,
      punctuality: evaluation.punctuality,
      workQuality: evaluation.workQuality,
      initiative: evaluation.initiative,
      teamwork: evaluation.teamwork,
      communication: evaluation.communication,
      attitude: evaluation.attitude,
      totalScore: evaluation.totalScore,
      rating: evaluation.rating,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      supervisorComments: evaluation.supervisorComments,
      status: evaluation.status,
      isLocked: evaluation.isLocked,
      lockedAt: evaluation.lockedAt?.toISOString() || null,
      supervisorSignedAt: evaluation.supervisorSignedAt?.toISOString() || null,
      hrVerifiedAt: evaluation.hrVerifiedAt?.toISOString() || null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation" },
      { status: 500 }
    );
  }
}

// PUT /api/evaluations/[id] - Update evaluation
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

    const existing = await db.evaluation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, ...fields } = body;

    // Handle status actions
    if (action === "submit") {
      // DRAFT → SUBMITTED
      if (existing.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft evaluations can be submitted" },
          { status: 400 }
        );
      }
      if (existing.isLocked) {
        return NextResponse.json(
          { error: "This evaluation is locked and cannot be modified" },
          { status: 400 }
        );
      }

      const updated = await db.evaluation.update({
        where: { id },
        data: {
          status: EvaluationStatus.SUBMITTED,
          supervisorSignedAt: new Date(),
          ...(fields.punctuality !== undefined && { punctuality: fields.punctuality }),
          ...(fields.workQuality !== undefined && { workQuality: fields.workQuality }),
          ...(fields.initiative !== undefined && { initiative: fields.initiative }),
          ...(fields.teamwork !== undefined && { teamwork: fields.teamwork }),
          ...(fields.communication !== undefined && { communication: fields.communication }),
          ...(fields.attitude !== undefined && { attitude: fields.attitude }),
          ...(fields.strengths !== undefined && { strengths: fields.strengths }),
          ...(fields.improvements !== undefined && { improvements: fields.improvements }),
          ...(fields.supervisorComments !== undefined && { supervisorComments: fields.supervisorComments }),
        },
      });

      return NextResponse.json({ id: updated.id, message: "Evaluation submitted successfully" });
    }

    if (action === "acknowledge") {
      // SUBMITTED → ACKNOWLEDGED
      if (existing.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Only submitted evaluations can be acknowledged" },
          { status: 400 }
        );
      }

      const updated = await db.evaluation.update({
        where: { id },
        data: {
          status: EvaluationStatus.ACKNOWLEDGED,
          hrVerifiedAt: new Date(),
        },
      });

      return NextResponse.json({ id: updated.id, message: "Evaluation acknowledged successfully" });
    }

    if (action === "lock") {
      // Only SUPER_ADMIN can lock
      if (user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Only Super Admin can lock evaluations" },
          { status: 403 }
        );
      }

      const updated = await db.evaluation.update({
        where: { id },
        data: {
          isLocked: true,
          lockedAt: new Date(),
        },
      });

      return NextResponse.json({ id: updated.id, message: "Evaluation locked successfully" });
    }

    if (action === "unlock") {
      // Only SUPER_ADMIN can unlock
      if (user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Only Super Admin can unlock evaluations" },
          { status: 403 }
        );
      }

      const updated = await db.evaluation.update({
        where: { id },
        data: {
          isLocked: false,
          lockedAt: null,
        },
      });

      return NextResponse.json({ id: updated.id, message: "Evaluation unlocked successfully" });
    }

    // Handle field updates (only if not locked)
    if (existing.isLocked && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "This evaluation is locked and cannot be modified" },
        { status: 400 }
      );
    }

    // Validate score ranges if scores are provided
    const scoreFields = ["punctuality", "workQuality", "initiative", "teamwork", "communication", "attitude"];
    for (const key of scoreFields) {
      if (fields[key] !== undefined) {
        const val = fields[key];
        if (typeof val !== "number" || val < 0 || val > 10) {
          return NextResponse.json(
            { error: `${key} must be a number between 0 and 10` },
            { status: 400 }
          );
        }
      }
    }

    // Recalculate total and rating if any score changed
    const hasScoreChange = scoreFields.some((k) => fields[k] !== undefined);
    let totalScore = existing.totalScore;
    let rating = existing.rating;

    if (hasScoreChange) {
      totalScore =
        (fields.punctuality !== undefined ? fields.punctuality : existing.punctuality) +
        (fields.workQuality !== undefined ? fields.workQuality : existing.workQuality) +
        (fields.initiative !== undefined ? fields.initiative : existing.initiative) +
        (fields.teamwork !== undefined ? fields.teamwork : existing.teamwork) +
        (fields.communication !== undefined ? fields.communication : existing.communication) +
        (fields.attitude !== undefined ? fields.attitude : existing.attitude);

      const percentage = (totalScore / 60) * 100;
      if (percentage >= 90) rating = EvaluationRating.EXCELLENT;
      else if (percentage >= 80) rating = EvaluationRating.OUTSTANDING;
      else if (percentage >= 70) rating = EvaluationRating.VERY_SATISFACTORY;
      else if (percentage >= 60) rating = EvaluationRating.SATISFACTORY;
      else if (percentage >= 50) rating = EvaluationRating.FAIR;
      else rating = EvaluationRating.POOR;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (hasScoreChange) {
      updateData.totalScore = totalScore;
      updateData.rating = rating;
    }
    for (const key of scoreFields) {
      if (fields[key] !== undefined) updateData[key] = fields[key];
    }
    if (fields.strengths !== undefined) updateData.strengths = fields.strengths;
    if (fields.improvements !== undefined) updateData.improvements = fields.improvements;
    if (fields.supervisorComments !== undefined) updateData.supervisorComments = fields.supervisorComments;
    if (fields.semester !== undefined) updateData.semester = fields.semester;
    if (fields.academicYear !== undefined) updateData.academicYear = fields.academicYear;
    if (fields.officeId !== undefined) updateData.officeId = fields.officeId;

    const updated = await db.evaluation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      totalScore: updated.totalScore,
      rating: updated.rating,
      message: "Evaluation updated successfully",
    });
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to update evaluation" },
      { status: 500 }
    );
  }
}

// DELETE /api/evaluations/[id] - Delete evaluation (SUPER_ADMIN only, DRAFT only)
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

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can delete evaluations" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.evaluation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft evaluations can be deleted" },
        { status: 400 }
      );
    }

    await db.evaluation.delete({ where: { id } });

    return NextResponse.json({ message: "Evaluation deleted successfully" });
  } catch (error) {
    console.error("Error deleting evaluation:", error);
    return NextResponse.json(
      { error: "Failed to delete evaluation" },
      { status: 500 }
    );
  }
}
