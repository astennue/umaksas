import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PaymentStatus } from "@prisma/client";

// PUT /api/collections/[id]/payments/[paymentId] - Verify/reject a collection payment
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const authResult = await requireRole(["SUPER_ADMIN", "ADVISER", "OFFICER"]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    const { id, paymentId } = await params;
    const body = await req.json();
    const { action, verificationNotes } = body;

    if (!action || !["verify", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'verify' or 'reject'" }, { status: 400 });
    }

    // Check if OFFICER has verify access (PRESIDENT or TREASURER)
    if (user.role === "OFFICER") {
      const officerProfile = await db.officerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!officerProfile || !["PRESIDENT", "TREASURER"].includes(officerProfile.position)) {
        return NextResponse.json({ error: "Only President or Treasurer can verify payments" }, { status: 403 });
      }
    }

    // Find the collection payment
    const payment = await db.collectionPayment.findUnique({
      where: { id: paymentId },
      include: {
        collection: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!payment || payment.collectionId !== id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending payments can be verified or rejected" }, { status: 400 });
    }

    const newStatus = action === "verify" ? PaymentStatus.PAID : PaymentStatus.REJECTED;

    const updated = await db.collectionPayment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        verifiedBy: user.id,
        verifiedAt: new Date(),
        verificationNotes: verificationNotes?.trim() || null,
      },
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
    });

    return NextResponse.json({ payment: updated });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
