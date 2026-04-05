import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/evaluation-rubric — Return all categories with their questions
export async function GET() {
  try {
    const categories = await db.evaluationRubricCategory.findMany({
      where: { isActive: true },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching evaluation rubric:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation rubric" },
      { status: 500 }
    );
  }
}
