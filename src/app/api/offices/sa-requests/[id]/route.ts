import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/offices/sa-requests/[id] - Approve/reject SA request (SUPER_ADMIN, ADVISER)
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

    if (!["SUPER_ADMIN", "ADVISER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin or Adviser can review SA requests" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reviewNotes } = body;

    if (!action || !["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json(
        { error: "action must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    const existing = await db.sARequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "SA Request not found" }, { status: 404 });
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been reviewed" },
        { status: 400 }
      );
    }

    const updated = await db.sARequest.update({
      where: { id },
      data: {
        status: action,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
      include: {
        office: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // If approved, update office capacity
    if (action === "APPROVED") {
      await db.office.update({
        where: { id: existing.officeId },
        data: {
          currentSACount: { increment: updated.requestedCount },
        },
      });
    }

    return NextResponse.json({
      id: updated.id,
      officeId: updated.officeId,
      officeName: updated.office.name,
      officeCode: updated.office.code,
      requestedCount: updated.requestedCount,
      reason: updated.reason,
      requirements: updated.requirements,
      preferredSkills: updated.preferredSkills,
      status: updated.status,
      reviewedBy: updated.reviewedBy,
      reviewedAt: updated.reviewedAt?.toISOString() || null,
      reviewNotes: updated.reviewNotes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error reviewing SA request:", error);
    return NextResponse.json(
      { error: "Failed to review SA request" },
      { status: 500 }
    );
  }
}
