import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/evaluations/summary - Evaluation summary stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all evaluations
    const evaluations = await db.evaluation.findMany({
      include: {
        sa: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const totalEvaluations = evaluations.length;
    const draftCount = evaluations.filter((e) => e.status === "DRAFT").length;
    const submittedCount = evaluations.filter((e) => e.status === "SUBMITTED").length;
    const acknowledgedCount = evaluations.filter((e) => e.status === "ACKNOWLEDGED").length;

    // Average scores by category
    const categories = [
      "punctuality", "workQuality", "initiative",
      "teamwork", "communication", "attitude",
    ] as const;

    const categoryAverages: Record<string, number> = {};
    for (const cat of categories) {
      const sum = evaluations.reduce((acc, e) => acc + e[cat], 0);
      categoryAverages[cat] = totalEvaluations > 0 ? sum / totalEvaluations : 0;
    }

    // Average total score
    const avgTotalScore =
      totalEvaluations > 0
        ? evaluations.reduce((acc, e) => acc + e.totalScore, 0) / totalEvaluations
        : 0;

    // Rating distribution
    const ratingDistribution: Record<string, number> = {
      EXCELLENT: 0,
      OUTSTANDING: 0,
      VERY_SATISFACTORY: 0,
      SATISFACTORY: 0,
      FAIR: 0,
      POOR: 0,
    };
    for (const e of evaluations) {
      if (e.rating) {
        ratingDistribution[e.rating]++;
      }
    }

    // Excellent count
    const excellentCount = ratingDistribution.EXCELLENT || 0;

    // Monthly trends (last 12 months)
    const now = new Date();
    const monthlyTrends: { month: number; year: number; monthName: string; count: number; avgScore: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];

      const monthEvals = evaluations.filter((e) => e.month === m && e.year === y);
      const monthTotal = monthEvals.length;
      const monthAvg =
        monthTotal > 0
          ? monthEvals.reduce((acc, e) => acc + e.totalScore, 0) / monthTotal
          : 0;

      monthlyTrends.push({
        month: m,
        year: y,
        monthName: MONTHS[m - 1],
        count: monthTotal,
        avgScore: Math.round(monthAvg * 100) / 100,
      });
    }

    // Top performing SAs
    const saPerformance = new Map<string, { id: string; name: string; totalScore: number; count: number }>();
    for (const e of evaluations) {
      const name = `${e.sa.firstName || ""} ${e.sa.lastName || ""}`.trim();
      const existing = saPerformance.get(e.saId);
      if (existing) {
        existing.totalScore += e.totalScore;
        existing.count++;
      } else {
        saPerformance.set(e.saId, { id: e.saId, name, totalScore: e.totalScore, count: 1 });
      }
    }
    const topSAs = Array.from(saPerformance.values())
      .map((s) => ({ ...s, avgScore: s.totalScore / s.count }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    return NextResponse.json({
      totalEvaluations,
      avgTotalScore: Math.round(avgTotalScore * 100) / 100,
      excellentCount,
      pendingReviews: draftCount + submittedCount,
      draftCount,
      submittedCount,
      acknowledgedCount,
      categoryAverages,
      ratingDistribution,
      monthlyTrends,
      topSAs,
    });
  } catch (error) {
    console.error("Error fetching evaluation summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation summary" },
      { status: 500 }
    );
  }
}
