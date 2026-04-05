import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus } from "@prisma/client";

// Helper: check if OFFICER has PRESIDENT or TREASURER position
async function isOfficerWithCloseAccess(userId: string): Promise<boolean> {
  const officer = await db.officerProfile.findUnique({ where: { userId } });
  return !!officer && ["PRESIDENT", "TREASURER"].includes(officer.position);
}

// POST /api/collections/[id]/close - Close a collection
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;

    // OFFICER must be PRESIDENT or TREASURER to close collections
    if (user.role === "OFFICER") {
      const hasAccess = await isOfficerWithCloseAccess(user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: "Only President or Treasurer can close collections" }, { status: 403 });
      }
    }

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
