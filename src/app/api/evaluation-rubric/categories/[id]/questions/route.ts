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

// POST /api/evaluation-rubric/categories/[id]/questions — Add a question to a category
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const { id: categoryId } = await params;
    const body = await request.json();
    const { question, description, orderIndex } = body;

    // Verify category exists
    const category = await db.evaluationRubricCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "Question text is required" },
        { status: 400 }
      );
    }

    // Get the current max orderIndex for this category
    const maxOrder = await db.evaluationRubricQuestion.findFirst({
      where: { categoryId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const newQuestion = await db.evaluationRubricQuestion.create({
      data: {
        categoryId,
        question: question.trim(),
        description: description?.trim() || null,
        orderIndex: typeof orderIndex === "number" ? orderIndex : (maxOrder?.orderIndex ?? -1) + 1,
        isActive: true,
      },
    });

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error("Error creating evaluation rubric question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
