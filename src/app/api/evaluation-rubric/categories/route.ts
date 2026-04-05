import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to check authorization for evaluation rubric mutations
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

// POST /api/evaluation-rubric/categories — Create a new category
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const body = await request.json();
    const { name, description, weight, maxScore, orderIndex } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    if (typeof weight !== "number" || weight < 0 || weight > 100) {
      return NextResponse.json(
        { error: "Weight must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    if (typeof maxScore !== "number" || maxScore < 1 || maxScore > 10) {
      return NextResponse.json(
        { error: "Max score must be a number between 1 and 10" },
        { status: 400 }
      );
    }

    // Get the current max orderIndex
    const maxOrder = await db.evaluationRubricCategory.findFirst({
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const category = await db.evaluationRubricCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        weight: weight ?? 25,
        maxScore: maxScore ?? 5,
        orderIndex: typeof orderIndex === "number" ? orderIndex : (maxOrder?.orderIndex ?? -1) + 1,
        isActive: true,
      },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating evaluation rubric category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
