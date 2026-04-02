import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

// GET /api/offices/[id] - Get office detail with assigned SAs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    const office = await db.office.findUnique({
      where: { id },
      include: {
        headUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            photoUrl: true,
            role: true,
          },
        },
        profiles: {
          where: {
            status: { in: ["ACTIVE", "COMPLETED"] },
            user: { isActive: true },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                photoUrl: true,
              },
            },
          },
          orderBy: { user: { lastName: "asc" } },
        },
        saRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!office) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }

    return NextResponse.json({
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
      updatedAt: office.updatedAt.toISOString(),
      assignedSAs: office.profiles.map((p) => ({
        id: p.userId,
        profileId: p.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        email: p.user.email,
        phone: p.user.phone,
        photoUrl: p.user.photoUrl,
        college: p.college,
        program: p.program,
        yearLevel: p.yearLevel,
        status: p.status,
        isOnDuty: p.isOnDuty,
        totalHoursWorked: p.totalHoursWorked,
        dateHired: p.dateHired?.toISOString() || null,
      })),
      saRequests: office.saRequests.map((r) => ({
        id: r.id,
        requestedCount: r.requestedCount,
        reason: r.reason,
        requirements: r.requirements,
        preferredSkills: r.preferredSkills,
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching office:", error);
    return NextResponse.json(
      { error: "Failed to fetch office" },
      { status: 500 }
    );
  }
}

// PUT /api/offices/[id] - Update office
// RBAC: Only SUPER_ADMIN, ADVISER can update offices
// Only SUPER_ADMIN, ADVISER can change office headUserId
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const body = await request.json();
    const { name, code, email, phone, location, description, headUserId, maxSACount, isActive } = body;

    // RBAC: Only SUPER_ADMIN, ADVISER can change office headUserId
    if (headUserId !== undefined) {
      // Already validated by requireRole above — only SUPER_ADMIN and ADVISER reach here
    }

    const existing = await db.office.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }

    // Check unique code if changing
    if (code && code !== existing.code) {
      const codeExists = await db.office.findUnique({ where: { code } });
      if (codeExists) {
        return NextResponse.json(
          { error: "An office with this code already exists" },
          { status: 409 }
        );
      }
    }

    // Resolve head user
    let headName: string | null = existing.headName;
    let headEmail: string | null = existing.headEmail;
    if (headUserId !== undefined && headUserId !== existing.headUserId) {
      if (headUserId) {
        const headUser = await db.user.findUnique({ where: { id: headUserId } });
        if (!headUser) {
          return NextResponse.json(
            { error: "Selected head user not found" },
            { status: 400 }
          );
        }
        headName = `${headUser.firstName || ""} ${headUser.lastName || ""}`.trim() || headUser.email;
        headEmail = headUser.email;
      } else {
        headName = null;
        headEmail = null;
      }
    }

    const office = await db.office.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(location !== undefined && { location: location || null }),
        ...(description !== undefined && { description: description || null }),
        ...(headUserId !== undefined && { headUserId: headUserId || null }),
        ...(headUserId !== undefined && { headName }),
        ...(headUserId !== undefined && { headEmail }),
        ...(maxSACount !== undefined && { maxSACount }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error updating office:", error);
    return NextResponse.json(
      { error: "Failed to update office" },
      { status: 500 }
    );
  }
}

// DELETE /api/offices/[id] - Archive office (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN"]);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    const existing = await db.office.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }

    const office = await db.office.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      id: office.id,
      name: office.name,
      isActive: office.isActive,
    });
  } catch (error) {
    console.error("Error archiving office:", error);
    return NextResponse.json(
      { error: "Failed to archive office" },
      { status: 500 }
    );
  }
}
