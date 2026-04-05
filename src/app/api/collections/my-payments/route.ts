import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/collections/my-payments — Returns all collection payments for the logged-in SA
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    // Fetch all collection payments for this user with collection details
    const payments = await db.collectionPayment.findMany({
      where: { userId: user.id },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            description: true,
            amount: true,
            paymentMethod: true,
            gcashNumber: true,
            gcashQrUrl: true,
            paymentInstructions: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute stats
    const stats = {
      total: payments.length,
      paid: payments.filter((p) => p.status === "PAID").length,
      pending: payments.filter((p) => p.status === "PENDING").length,
      unpaid: payments.filter((p) => p.status === "UNPAID").length,
      rejected: payments.filter((p) => p.status === "REJECTED").length,
    };

    return NextResponse.json({ payments, stats });
  } catch (error) {
    console.error("Error fetching my payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

// PUT /api/collections/my-payments — Submit payment proof
export async function PUT(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await req.json();
    const { paymentId, transactionNumber, amountPaid, proofUrl } = body;

    // Validate required fields
    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }
    if (!transactionNumber || !transactionNumber.trim()) {
      return NextResponse.json({ error: "Transaction number is required" }, { status: 400 });
    }
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      return NextResponse.json({ error: "Amount paid must be greater than 0" }, { status: 400 });
    }
    if (!proofUrl) {
      return NextResponse.json({ error: "Proof of payment is required" }, { status: 400 });
    }

    // Fetch the payment record
    const payment = await db.collectionPayment.findUnique({
      where: { id: paymentId },
      include: {
        collection: {
          select: { status: true, title: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    // Verify ownership
    if (payment.userId !== user.id) {
      return NextResponse.json({ error: "This payment does not belong to you" }, { status: 403 });
    }

    // Verify collection is active
    if (payment.collection.status !== "ACTIVE") {
      return NextResponse.json({ error: "This collection is no longer accepting payments" }, { status: 400 });
    }

    // Verify status is UNPAID or REJECTED
    if (payment.status !== "UNPAID" && payment.status !== "REJECTED") {
      return NextResponse.json(
        { error: `Cannot submit proof for a payment with status: ${payment.status}` },
        { status: 400 }
      );
    }

    // Generate tracking number if not exists
    let trackingNumber = payment.trackingNumber;
    if (!trackingNumber) {
      trackingNumber = `PAY-${payment.collectionId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${user.id.slice(-4).toUpperCase()}`;
    }

    // Update the payment
    const updatedPayment = await db.collectionPayment.update({
      where: { id: paymentId },
      data: {
        transactionNumber: transactionNumber.trim(),
        amountPaid: parseFloat(amountPaid),
        proofUrl,
        trackingNumber,
        status: PaymentStatus.PENDING,
        uploadedAt: new Date(),
      },
    });

    // Create notification for the submitting user
    try {
      await db.notification.create({
        data: {
          userId: user.id,
          type: "COLLECTION_PAYMENT_SUBMITTED",
          title: "Payment Proof Submitted",
          message: `Your payment proof for "${payment.collection.title}" has been submitted successfully. Tracking number: ${trackingNumber}. Please wait for verification.`,
          link: "/dashboard/payments",
        },
      });
    } catch {
      // Non-critical: notification creation failure should not block
    }

    // Notify admin users (SUPER_ADMIN, ADVISER, PRESIDENT, TREASURER officers) about the new submission
    try {
      // Find eligible admin users
      const [superAdmins, advisers, officers] = await Promise.all([
        db.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true }, select: { id: true } }),
        db.user.findMany({ where: { role: "ADVISER", isActive: true }, select: { id: true } }),
        db.officerProfile.findMany({
          where: { position: { in: ["PRESIDENT", "TREASURER"] }, user: { isActive: true } },
          select: { userId: true },
        }),
      ]);

      const adminUserIds = [
        ...superAdmins.map((u) => u.id),
        ...advisers.map((u) => u.id),
        ...officers.map((o) => o.userId),
      ];

      const uniqueAdminIds = [...new Set(adminUserIds)];

      if (uniqueAdminIds.length > 0) {
        const payerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
        await db.notification.createMany({
          data: uniqueAdminIds.map((adminId) => ({
            userId: adminId,
            type: "COLLECTION_PAYMENT_SUBMITTED",
            title: "New Collection Payment Submitted",
            message: `${payerName} submitted a payment proof for "${payment.collection.title}". Tracking number: ${trackingNumber}.`,
            link: `/dashboard/collections/${payment.collectionId}`,
          })),
        });
      }
    } catch {
      // Non-critical: notification creation failure should not block
    }

    return NextResponse.json({
      payment: updatedPayment,
      trackingNumber,
    });
  } catch (error) {
    console.error("Error submitting payment proof:", error);
    return NextResponse.json({ error: "Failed to submit payment proof" }, { status: 500 });
  }
}
