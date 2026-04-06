import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CollectionStatus, PaymentStatus, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

// Helper: parse targetRoles field
function parseTargetRoles(targetRolesStr: string): { mode: string; userIds?: string[]; legacyRoles?: UserRole[] } {
  try {
    const parsed = JSON.parse(targetRolesStr);
    if (Array.isArray(parsed)) {
      return { mode: "LEGACY", legacyRoles: parsed };
    }
    return parsed;
  } catch {
    return { mode: "LEGACY", legacyRoles: ["STUDENT_ASSISTANT"] };
  }
}

// POST /api/collections/[id]/activate - Activate collection and auto-generate payments
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

    if (collection.status === "ACTIVE") {
      return NextResponse.json({ error: "Collection is already active" }, { status: 400 });
    }

    if (collection.status === "CLOSED") {
      return NextResponse.json({ error: "Cannot activate a closed collection" }, { status: 400 });
    }

    // Parse target and get user IDs
    const parsed = parseTargetRoles(collection.targetRoles);
    const targetUserIds: string[] = [];

    if (parsed.mode === "LEGACY" && parsed.legacyRoles) {
      const users = await db.user.findMany({
        where: { role: { in: parsed.legacyRoles }, isActive: true },
        select: { id: true },
      });
      targetUserIds.push(...users.map((u) => u.id));
    } else if (parsed.mode === "ALL_SAS") {
      const users = await db.user.findMany({
        where: { role: "STUDENT_ASSISTANT", isActive: true },
        select: { id: true },
      });
      targetUserIds.push(...users.map((u) => u.id));
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
      targetUserIds.push(...users.map((u) => u.id));
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
      targetUserIds.push(...users.map((u) => u.id));
    } else if (parsed.mode === "INDIVIDUAL" && parsed.userIds) {
      targetUserIds.push(...parsed.userIds);
    }

    // Deduplicate
    const uniqueUserIds = [...new Set(targetUserIds)];

    // Check which users already have a payment for this collection
    const existingPayments = await db.collectionPayment.findMany({
      where: { collectionId: id },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingPayments.map((p) => p.userId));

    const newUsers = uniqueUserIds.filter((uid) => !existingUserIds.has(uid));

    // Create payments in batch
    let created = 0;
    for (const userId of newUsers) {
      const trackingNum = `CP-${id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${userId.slice(-4).toUpperCase()}`;
      await db.collectionPayment.create({
        data: {
          collectionId: id,
          userId,
          amount: collection.amount,
          status: PaymentStatus.UNPAID,
          trackingNumber: trackingNum,
        },
      });
      created++;
    }

    // Activate the collection
    const updated = await db.paymentCollection.update({
      where: { id },
      data: { status: CollectionStatus.ACTIVE },
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

    return NextResponse.json({
      collection: updated,
      paymentsGenerated: created,
      skipped: uniqueUserIds.length - created,
    });
  } catch (error) {
    console.error("Error activating collection:", error);
    return NextResponse.json({ error: "Failed to activate collection" }, { status: 500 });
  }
}
