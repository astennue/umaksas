import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus, PaymentStatus } from "@prisma/client";

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

    // OFFICER can only see ACTIVE collections
    if (user.role === "OFFICER") {
      where.status = "ACTIVE";
    }

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

        return {
          ...col,
          totalCollected,
          pendingCount,
          paidCount,
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

// POST /api/collections - Create a new collection
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    const body = await req.json();
    const {
      title,
      description,
      amount,
      paymentMethod,
      targetRoles,
      startDate,
      endDate,
      gcashNumber,
      paymentInstructions,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (!paymentMethod || !["GCASH", "MANUAL", "BOTH"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Valid payment method is required" }, { status: 400 });
    }

    if (!targetRoles || !Array.isArray(targetRoles) || targetRoles.length === 0) {
      return NextResponse.json({ error: "At least one target role is required" }, { status: 400 });
    }

    if (paymentMethod === "GCASH" || paymentMethod === "BOTH") {
      if (!gcashNumber || !gcashNumber.trim()) {
        return NextResponse.json({ error: "GCash number is required for GCash/BOTH payment method" }, { status: 400 });
      }
    }

    const collection = await db.paymentCollection.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        paymentMethod,
        targetRoles: JSON.stringify(targetRoles),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        gcashNumber: gcashNumber?.trim() || null,
        paymentInstructions: paymentInstructions?.trim() || null,
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
