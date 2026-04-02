import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/applications/admin - List all applications for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const adminRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER", "HRMO"];
    if (!userRole || !adminRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where["status"] = status;
    }

    if (search) {
      where["OR"] = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { applicantEmail: { contains: search } },
        { college: { contains: search } },
      ];
    }

    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          applicantEmail: true,
          userId: true,
          firstName: true,
          lastName: true,
          college: true,
          program: true,
          status: true,
          interviewStatus: true,
          interviewScore: true,
          interviewDate: true,
          totalScore: true,
          rank: true,
          currentStep: true,
          submittedAt: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.application.count({ where }),
    ]);

    return NextResponse.json({
      applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
