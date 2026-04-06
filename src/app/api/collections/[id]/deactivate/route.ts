import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus } from "@prisma/client";

// POST /api/collections/[id]/deactivate - Deactivate collection (ACTIVE → DRAFT)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;

    const { id } = await params;

    const collection = await db.paymentCollection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.status !== "ACTIVE") {
      return NextResponse.json({ error: "Only active collections can be deactivated" }, { status: 400 });
    }

    const updated = await db.paymentCollection.update({
      where: { id },
      data: { status: CollectionStatus.DRAFT },
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

    return NextResponse.json({ collection: updated });
  } catch (error) {
    console.error("Error deactivating collection:", error);
    return NextResponse.json({ error: "Failed to deactivate collection" }, { status: 500 });
  }
}
