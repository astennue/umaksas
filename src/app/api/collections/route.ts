import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus, PaymentStatus, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/collections - List all collections
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};

    if (status && ["ACTIVE", "DRAFT", "CLOSED"].includes(status)) {
      where.status = status;
    }

    // OFFICER can see all statuses (PRESIDENT/TREASURER get full CRUD, others view-only)
    // The frontend handles what actions are available per role

    const [collections, total] = await Promise.all([
      db.paymentCollection.findMany({
        where,
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
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.paymentCollection.count({ where }),
    ]);

    // Compute collected amounts
    const collectionsWithStats = await Promise.all(
      collections.map(async (col) => {
        const payments = await db.collectionPayment.findMany({
          where: { collectionId: col.id },
          select: { amount: true, status: true, amountPaid: true },
        });

        const totalCollected = payments
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum + (p.amountPaid || p.amount), 0);
        const pendingCount = payments.filter((p) => p.status === "PENDING").length;
        const paidCount = payments.filter((p) => p.status === "PAID").length;
        const unpaidCount = payments.filter((p) => p.status === "UNPAID").length;

        return {
          ...col,
          totalCollected,
          pendingCount,
          paidCount,
          unpaidCount,
        };
      })
    );

    return NextResponse.json({
      collections: collectionsWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}

// Helper: check if OFFICER has PRESIDENT or TREASURER position
async function isOfficerWithCreateAccess(userId: string): Promise<boolean> {
  const officer = await db.officerProfile.findUnique({ where: { userId } });
  return !!officer && ["PRESIDENT", "TREASURER"].includes(officer.position);
}

// POST /api/collections - Create a new collection
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;

    // OFFICER must be PRESIDENT or TREASURER to create collections
    if (user.role === "OFFICER") {
      const hasAccess = await isOfficerWithCreateAccess(user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: "Only President or Treasurer can create collections" }, { status: 403 });
      }
    }

    const body = await req.json();
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

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (!deadline) {
      return NextResponse.json({ error: "Deadline is required" }, { status: 400 });
    }

    const validTargets = ["ALL_SAS", "ALL_OFFICERS", "ALL", "INDIVIDUAL"];
    if (!target || !validTargets.includes(target)) {
      return NextResponse.json({ error: "Valid target is required" }, { status: 400 });
    }

    if (target === "INDIVIDUAL" && (!individualUserIds || !Array.isArray(individualUserIds) || individualUserIds.length === 0)) {
      return NextResponse.json({ error: "At least one user must be selected for Individual target" }, { status: 400 });
    }

    if (!paymentMethod || !["GCASH", "MANUAL", "BOTH"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Valid payment method is required" }, { status: 400 });
    }

    if ((paymentMethod === "GCASH" || paymentMethod === "BOTH") && (!gcashNumber || !gcashNumber.trim())) {
      return NextResponse.json({ error: "GCash number is required for GCash/BOTH payment method" }, { status: 400 });
    }

    // Build targetRoles JSON - supports both new object format and legacy array format
    let targetRolesJson: string;
    if (target === "INDIVIDUAL") {
      targetRolesJson = JSON.stringify({ mode: "INDIVIDUAL", userIds: individualUserIds });
    } else {
      targetRolesJson = JSON.stringify({ mode: target });
    }

    const collection = await db.paymentCollection.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        endDate: new Date(deadline),
        targetRoles: targetRolesJson,
        paymentMethod,
        gcashNumber: (paymentMethod === "GCASH" || paymentMethod === "BOTH") ? gcashNumber.trim() : null,
        gcashQrUrl: gcashQrUrl || null,
        paymentInstructions: (paymentMethod === "GCASH" || paymentMethod === "BOTH") ? (paymentInstructions?.trim() || null) : null,
        status: CollectionStatus.DRAFT,
        createdBy: user.id,
      },
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

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
