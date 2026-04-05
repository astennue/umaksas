import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus, PaymentStatus, UserRole } from "@prisma/client";

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

    // OFFICER can only view ACTIVE collections
    if (user.role === "OFFICER" && collection.status !== "ACTIVE") {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Compute stats
    const payments = collection.collectionPayments;
    const totalCollected = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + (p.amountPaid || p.amount), 0);
    const pendingCount = payments.filter((p) => p.status === "PENDING").length;
    const paidCount = payments.filter((p) => p.status === "PAID").length;

    return NextResponse.json({
      ...collection,
      totalCollected,
      pendingCount,
      paidCount,
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
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
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
      paymentMethod,
      targetRoles,
      startDate,
      endDate,
      gcashNumber,
      paymentInstructions,
      status,
    } = body;

    // Validate fields
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (amount !== undefined && (parseFloat(amount) <= 0)) {
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
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (targetRoles !== undefined) updateData.targetRoles = JSON.stringify(targetRoles);
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (gcashNumber !== undefined) updateData.gcashNumber = gcashNumber?.trim() || null;
    if (paymentInstructions !== undefined) updateData.paymentInstructions = paymentInstructions?.trim() || null;

    // Allow status change to ACTIVE or DRAFT
    if (status !== undefined && ["ACTIVE", "DRAFT"].includes(status)) {
      updateData.status = status;
    }

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

// POST /api/collections/[id]/generate - Generate payments for target SAs
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    const { id } = await params;

    const collection = await db.paymentCollection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.status !== "ACTIVE") {
      return NextResponse.json({ error: "Collection must be active to generate payments" }, { status: 400 });
    }

    const targetRoles: string[] = JSON.parse(collection.targetRoles);

    // Fetch target users based on target roles
    const targetUsers = await db.user.findMany({
      where: {
        role: { in: targetRoles as UserRole[] },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    let created = 0;
    let skipped = 0;

    for (const targetUser of targetUsers) {
      // Check if payment already exists
      const existing = await db.collectionPayment.findUnique({
        where: {
          collectionId_userId: {
            collectionId: id,
            userId: targetUser.id,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Generate tracking number
      const trackingNum = `CP-${id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${targetUser.id.slice(-4).toUpperCase()}`;

      await db.collectionPayment.create({
        data: {
          collectionId: id,
          userId: targetUser.id,
          amount: collection.amount,
          status: PaymentStatus.UNPAID,
          trackingNumber: trackingNum,
        },
      });
      created++;
    }

    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error("Error generating payments:", error);
    return NextResponse.json({ error: "Failed to generate payments" }, { status: 500 });
  }
}
