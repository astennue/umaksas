import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/offices/[id]/sa-requests - List SA requests for an office
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

    const office = await db.office.findUnique({ where: { id } });
    if (!office) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = { officeId: id };
    if (status) {
      where["status"] = status;
    }

    const [requests, total] = await Promise.all([
      db.sARequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          office: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      db.sARequest.count({ where }),
    ]);

    return NextResponse.json({
      saRequests: requests.map((r) => ({
        id: r.id,
        officeId: r.officeId,
        officeName: r.office.name,
        officeCode: r.office.code,
        requestedCount: r.requestedCount,
        reason: r.reason,
        requirements: r.requirements,
        preferredSkills: r.preferredSkills,
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching SA requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch SA requests" },
      { status: 500 }
    );
  }
}

// POST /api/offices/[id]/sa-requests - Create SA request (SUPER_ADMIN, ADVISER, OFFICER)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin, Adviser, or Officer can create SA requests" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const office = await db.office.findUnique({ where: { id } });
    if (!office) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }

    const body = await request.json();
    const { requestedCount, reason, requirements, preferredSkills } = body;

    if (!requestedCount || requestedCount < 1) {
      return NextResponse.json(
        { error: "requestedCount must be at least 1" },
        { status: 400 }
      );
    }

    const saRequest = await db.sARequest.create({
      data: {
        officeId: id,
        requestedCount,
        reason: reason || null,
        requirements: requirements || null,
        preferredSkills: preferredSkills || null,
      },
      include: {
        office: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json(
      {
        id: saRequest.id,
        officeId: saRequest.officeId,
        officeName: saRequest.office.name,
        officeCode: saRequest.office.code,
        requestedCount: saRequest.requestedCount,
        reason: saRequest.reason,
        requirements: saRequest.requirements,
        preferredSkills: saRequest.preferredSkills,
        status: saRequest.status,
        createdAt: saRequest.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating SA request:", error);
    return NextResponse.json(
      { error: "Failed to create SA request" },
      { status: 500 }
    );
  }
}
