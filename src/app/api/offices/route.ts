import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/offices - List offices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      const terms = search.split(/\s+/);
      where["OR"] = terms.flatMap((term) => [
        { name: { contains: term } },
        { code: { contains: term } },
        { headName: { contains: term } },
        { location: { contains: term } },
        { email: { contains: term } },
      ]);
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where["isActive"] = isActive === "true";
    }

    const [offices, total, pendingRequests] = await Promise.all([
      db.office.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          headUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true,
            },
          },
          _count: {
            select: { profiles: true, saRequests: true },
          },
        },
      }),
      db.office.count({ where }),
      db.sARequest.count({ where: { status: "PENDING" } }),
    ]);

    const result = offices.map((office) => ({
      id: office.id,
      name: office.name,
      code: office.code,
      email: office.email,
      phone: office.phone,
      location: office.location,
      description: office.description,
      headName: office.headName,
      headEmail: office.headEmail,
      headUserId: office.headUserId,
      headUser: office.headUser
        ? {
            id: office.headUser.id,
            firstName: office.headUser.firstName,
            lastName: office.headUser.lastName,
            email: office.headUser.email,
            photoUrl: office.headUser.photoUrl,
          }
        : null,
      maxSACount: office.maxSACount,
      currentSACount: office.currentSACount,
      saCount: office._count.profiles,
      requestCount: office._count.saRequests,
      isActive: office.isActive,
      createdAt: office.createdAt.toISOString(),
      updatedAt: office.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      offices: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      pendingRequests,
    });
  } catch (error) {
    console.error("Error fetching offices:", error);
    return NextResponse.json(
      { error: "Failed to fetch offices" },
      { status: 500 }
    );
  }
}

// POST /api/offices - Create office (SUPER_ADMIN, ADVISER only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (!["SUPER_ADMIN", "ADVISER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin or Adviser can create offices" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, email, phone, location, description, headUserId, maxSACount } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Office name is required" },
        { status: 400 }
      );
    }

    // Check unique code
    if (code) {
      const existing = await db.office.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json(
          { error: "An office with this code already exists" },
          { status: 409 }
        );
      }
    }

    // Resolve head user
    let headName: string | null = null;
    let headEmail: string | null = null;
    if (headUserId) {
      const headUser = await db.user.findUnique({
        where: { id: headUserId },
      });
      if (!headUser) {
        return NextResponse.json(
          { error: "Selected head user not found" },
          { status: 400 }
        );
      }
      headName = `${headUser.firstName || ""} ${headUser.lastName || ""}`.trim() || headUser.email;
      headEmail = headUser.email;
    }

    const office = await db.office.create({
      data: {
        name,
        code: code || null,
        email: email || null,
        phone: phone || null,
        location: location || null,
        description: description || null,
        headUserId: headUserId || null,
        headName,
        headEmail,
        maxSACount: maxSACount || 5,
      },
      include: {
        headUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: office.id,
        name: office.name,
        code: office.code,
        email: office.email,
        phone: office.phone,
        location: office.location,
        description: office.description,
        headName: office.headName,
        headEmail: office.headEmail,
        headUserId: office.headUserId,
        headUser: office.headUser,
        maxSACount: office.maxSACount,
        currentSACount: office.currentSACount,
        isActive: office.isActive,
        createdAt: office.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating office:", error);
    return NextResponse.json(
      { error: "Failed to create office" },
      { status: 500 }
    );
  }
}
