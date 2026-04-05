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

// PUT /api/evaluation-rubric/categories/[id] — Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.evaluationRubricCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.weight !== undefined) {
      if (typeof body.weight !== "number" || body.weight < 0 || body.weight > 100) {
        return NextResponse.json({ error: "Weight must be between 0 and 100" }, { status: 400 });
      }
      updateData.weight = body.weight;
    }
    if (body.maxScore !== undefined) {
      if (typeof body.maxScore !== "number" || body.maxScore < 1 || body.maxScore > 10) {
        return NextResponse.json({ error: "Max score must be between 1 and 10" }, { status: 400 });
      }
      updateData.maxScore = body.maxScore;
    }
    if (body.orderIndex !== undefined) {
      updateData.orderIndex = body.orderIndex;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    const updated = await db.evaluationRubricCategory.update({
      where: { id },
      data: updateData,
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating evaluation rubric category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/evaluation-rubric/categories/[id] — Delete a category (cascades to questions)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const { id } = await params;
    const existing = await db.evaluationRubricCategory.findUnique({
      where: { id },
      include: {
        questions: {
          select: { id: true },
        },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Delete will cascade to questions via onDelete: Cascade
    await db.evaluationRubricCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deletedQuestions: existing.questions.length,
    });
  } catch (error) {
    console.error("Error deleting evaluation rubric category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
