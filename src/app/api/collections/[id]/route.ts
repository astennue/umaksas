import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus, PaymentStatus, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

// Helper: check if OFFICER has PRESIDENT or TREASURER position
async function isOfficerWithManageAccess(userId: string): Promise<boolean> {
  const officer = await db.officerProfile.findUnique({ where: { userId } });
  return !!officer && ["PRESIDENT", "TREASURER"].includes(officer.position);
}

// Helper: parse targetRoles field (supports both old array format and new object format)
function parseTargetRoles(targetRolesStr: string): { mode: string; userIds?: string[]; legacyRoles?: UserRole[] } {
  try {
    const parsed = JSON.parse(targetRolesStr);
    if (Array.isArray(parsed)) {
      // Legacy format: ["STUDENT_ASSISTANT", "OFFICER"]
      return { mode: "LEGACY", legacyRoles: parsed };
    }
    // New format: { mode: "ALL_SAS" } or { mode: "INDIVIDUAL", userIds: [...] }
    return parsed;
  } catch {
    return { mode: "LEGACY", legacyRoles: ["STUDENT_ASSISTANT"] };
  }
}

// Helper: get target user IDs based on targetRoles
export async function getTargetUserIds(targetRolesStr: string): Promise<string[]> {
  const parsed = parseTargetRoles(targetRolesStr);
  const userIds: string[] = [];

  if (parsed.mode === "LEGACY" && parsed.legacyRoles) {
    // Legacy: use role-based query
    const users = await db.user.findMany({
      where: { role: { in: parsed.legacyRoles }, isActive: true },
      select: { id: true },
    });
    userIds.push(...users.map((u) => u.id));
  } else if (parsed.mode === "ALL_SAS") {
    const users = await db.user.findMany({
      where: { role: "STUDENT_ASSISTANT", isActive: true },
      select: { id: true },
    });
    userIds.push(...users.map((u) => u.id));
  } else if (parsed.mode === "ALL_OFFICERS") {
    const users = await db.user.findMany({
      where: {
        OR: [
          { role: "OFFICER", isActive: true },
          { role: "ADVISER", isActive: true },
        ],
      },
      select: { id: true },
    });
    userIds.push(...users.map((u) => u.id));
  } else if (parsed.mode === "ALL") {
    const users = await db.user.findMany({
      where: {
        OR: [
          { role: "STUDENT_ASSISTANT", isActive: true },
          { role: "OFFICER", isActive: true },
          { role: "ADVISER", isActive: true },
        ],
      },
      select: { id: true },
    });
    userIds.push(...users.map((u) => u.id));
  } else if (parsed.mode === "INDIVIDUAL" && parsed.userIds) {
    userIds.push(...parsed.userIds);
  }

  return [...new Set(userIds)];
}

// GET /api/collections/[id] - Get single collection with payments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    const { id } = await params;

    const collection = await db.paymentCollection.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        collectionPayments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                email: true,
                photoUrl: true,
                role: true,
                profile: {
                  select: {
                    college: true,
                    program: true,
                    office: {
                      select: { name: true, code: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Compute stats
    const payments = collection.collectionPayments;
    const totalCollected = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + (p.amountPaid || p.amount), 0);
    const pendingCount = payments.filter((p) => p.status === "PENDING").length;
    const paidCount = payments.filter((p) => p.status === "PAID").length;
    const unpaidCount = payments.filter((p) => p.status === "UNPAID").length;

    return NextResponse.json({
      ...collection,
      totalCollected,
      pendingCount,
      paidCount,
      unpaidCount,
    });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 });
  }
}

// PUT /api/collections/[id] - Update a collection
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;

    // OFFICER must be PRESIDENT or TREASURER to update collections
    if (user.role === "OFFICER") {
      const hasAccess = await isOfficerWithManageAccess(user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: "Only President or Treasurer can update collections" }, { status: 403 });
      }
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.paymentCollection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json({ error: "Cannot update a closed collection" }, { status: 400 });
    }

    const {
      title,
      description,
      amount,
      deadline,
      target,
      individualUserIds,
      paymentMethod,
      gcashNumber,
      gcashQrUrl,
      paymentInstructions,
    } = body;

    // Validate fields
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (amount !== undefined && parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (paymentMethod !== undefined && !["GCASH", "MANUAL", "BOTH"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Valid payment method is required" }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (deadline !== undefined) updateData.endDate = deadline ? new Date(deadline) : null;

    // Handle target update
    if (target !== undefined) {
      const validTargets = ["ALL_SAS", "ALL_OFFICERS", "ALL", "INDIVIDUAL"];
      if (!validTargets.includes(target)) {
        return NextResponse.json({ error: "Valid target is required" }, { status: 400 });
      }
      if (target === "INDIVIDUAL" && (!individualUserIds || !Array.isArray(individualUserIds) || individualUserIds.length === 0)) {
        return NextResponse.json({ error: "At least one user must be selected for Individual target" }, { status: 400 });
      }

      let targetRolesJson: string;
      if (target === "INDIVIDUAL") {
        targetRolesJson = JSON.stringify({ mode: "INDIVIDUAL", userIds: individualUserIds });
      } else {
        targetRolesJson = JSON.stringify({ mode: target });
      }
      updateData.targetRoles = targetRolesJson;
    }

    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (gcashNumber !== undefined) updateData.gcashNumber = gcashNumber?.trim() || null;
    if (gcashQrUrl !== undefined) updateData.gcashQrUrl = gcashQrUrl || null;
    if (paymentInstructions !== undefined) updateData.paymentInstructions = paymentInstructions?.trim() || null;

    const collection = await db.paymentCollection.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            collectionPayments: true,
          },
        },
      },
    });

    return NextResponse.json({ collection });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}

// DELETE /api/collections/[id] - Hard delete a collection and all its payments
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;

    // OFFICER must be PRESIDENT or TREASURER to delete collections
    if (user.role === "OFFICER") {
      const hasAccess = await isOfficerWithManageAccess(user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: "Only President or Treasurer can delete collections" }, { status: 403 });
      }
    }

    const { id } = await params;

    const existing = await db.paymentCollection.findUnique({
      where: { id },
      include: {
        _count: {
          select: { collectionPayments: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Delete all associated payments first, then the collection
    await db.$transaction([
      db.collectionPayment.deleteMany({ where: { collectionId: id } }),
      db.paymentCollection.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      message: "Collection deleted successfully",
      deletedPayments: existing._count.collectionPayments,
    });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
