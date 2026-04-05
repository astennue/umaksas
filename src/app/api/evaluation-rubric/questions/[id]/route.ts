import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to check authorization
async function checkAuth(): Promise<
  | { authorized: true }
  | NextResponse
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  const userRole = (session.user as { role?: string }).role;

  if (userRole === "SUPER_ADMIN" || userRole === "ADVISER") {
    return { authorized: true };
  } else if (userRole === "OFFICER" && userId) {
    const officer = await db.officerProfile.findFirst({
      where: { userId, position: "PRESIDENT" },
    });
    if (!officer) {
      return NextResponse.json(
        { error: "Forbidden. Only SUPER_ADMIN, ADVISER, or SAS President can manage evaluation rubrics." },
        { status: 403 }
      );
    }
    return { authorized: true };
  } else {
    return NextResponse.json(
      { error: "Forbidden. Only SUPER_ADMIN, ADVISER, or SAS President can manage evaluation rubrics." },
      { status: 403 }
    );
  }
}

// PUT /api/evaluation-rubric/questions/[id] — Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.evaluationRubricQuestion.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.question !== undefined) {
      if (!body.question.trim()) {
        return NextResponse.json({ error: "Question text cannot be empty" }, { status: 400 });
      }
      updateData.question = body.question.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.orderIndex !== undefined) {
      updateData.orderIndex = body.orderIndex;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    const updated = await db.evaluationRubricQuestion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating evaluation rubric question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE /api/evaluation-rubric/questions/[id] — Delete a question
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const { id } = await params;
    const existing = await db.evaluationRubricQuestion.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    await db.evaluationRubricQuestion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting evaluation rubric question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
