import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/interviews - List all interviews with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    const allowedRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER"];
    if (!allowedRoles.includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where["status"] = status;
    }

    if (startDate) {
      where["scheduledAt"] = {
        ...(where["scheduledAt"] as Record<string, unknown> || {}),
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where["scheduledAt"] = {
        ...(where["scheduledAt"] as Record<string, unknown> || {}),
        lte: new Date(endDate + "T23:59:59"),
      };
    }

    const [interviews, total] = await Promise.all([
      db.interviewSlot.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          interviewer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          interviewee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          application: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              applicantEmail: true,
              college: true,
              program: true,
              status: true,
              interviewStatus: true,
            },
          },
        },
      }),
      db.interviewSlot.count({ where }),
    ]);

    return NextResponse.json({
      interviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}
