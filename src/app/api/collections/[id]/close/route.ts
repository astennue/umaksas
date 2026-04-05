import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus } from "@prisma/client";

// POST /api/collections/[id]/close - Close a collection
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    const collection = await db.paymentCollection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.status === "CLOSED") {
      return NextResponse.json({ error: "Collection is already closed" }, { status: 400 });
    }

    const updated = await db.paymentCollection.update({
      where: { id },
      data: { status: CollectionStatus.CLOSED },
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
    console.error("Error closing collection:", error);
    return NextResponse.json({ error: "Failed to close collection" }, { status: 500 });
  }
}
