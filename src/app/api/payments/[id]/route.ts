import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PaymentStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const userId = authResult.user.id;
    const userRole = authResult.user.role;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            phone: true,
            photoUrl: true,
            role: true,
            profile: {
              select: {
                college: true,
                program: true,
                yearLevel: true,
                studentNumber: true,
                employeeId: true,
                office: {
                  select: { name: true, code: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // STUDENT_ASSISTANT can only view their own payments
    if (userRole === "STUDENT_ASSISTANT" && payment.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const userId = authResult.user.id;
    const userRole = authResult.user.role;

    const payment = await db.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, proofUrl, verificationNotes, status: newStatus, amount, transactionNumber, amountPaid } = body;

    // STUDENT_ASSISTANT can only upload proof
    if (userRole === "STUDENT_ASSISTANT") {
      if (payment.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (action === "upload_proof") {
        if (!proofUrl) {
          return NextResponse.json({ error: "proofUrl is required" }, { status: 400 });
        }
        if (payment.status !== PaymentStatus.UNPAID && payment.status !== PaymentStatus.REJECTED) {
          return NextResponse.json({ error: "Can only upload proof for unpaid or rejected payments" }, { status: 400 });
        }

        const updated = await db.payment.update({
          where: { id },
          data: {
            proofUrl,
            uploadedAt: new Date(),
            status: PaymentStatus.PENDING,
            ...(transactionNumber && { transactionNumber }),
            ...(amountPaid !== undefined && amountPaid !== null && { amountPaid: parseFloat(amountPaid) }),
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photoUrl: true,
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
      }

      return NextResponse.json({ error: "Forbidden action" }, { status: 403 });
    }

    // RBAC: SUPER_ADMIN, ADVISER, and OFFICER (Treasurer/President) can verify/reject payments
    const canVerify = userRole === "SUPER_ADMIN" || userRole === "ADVISER" || userRole === "OFFICER";

    if (action === "verify" || action === "approve") {
      if (!canVerify) {
        return NextResponse.json({ error: "Forbidden: only SUPER_ADMIN, ADVISER, or OFFICER can verify payments" }, { status: 403 });
      }

      if (payment.status !== PaymentStatus.PENDING) {
        return NextResponse.json({ error: "Can only verify pending payments" }, { status: 400 });
      }

      const updated = await db.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.PAID,
          verifiedBy: userId,
          verifiedAt: new Date(),
          verificationNotes: verificationNotes || null,
          receiptGeneratedAt: new Date(),
          receiptUrl: `/receipts/${id}`,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true,
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

      // Create notification for the SA
      const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      await db.notification.create({
        data: {
          userId: payment.userId,
          type: "PAYMENT_VERIFIED",
          title: "Payment Verified",
          message: `Your payment for ${monthNames[payment.month]} ${payment.year} has been verified and approved.`,
          link: "/dashboard/payments",
        },
      });

      return NextResponse.json({ payment: updated });
    }

    if (action === "reject") {
      if (!canVerify) {
        return NextResponse.json({ error: "Forbidden: only SUPER_ADMIN, ADVISER, or OFFICER can reject payments" }, { status: 403 });
      }
      if (payment.status !== PaymentStatus.PENDING) {
        return NextResponse.json({ error: "Can only reject pending payments" }, { status: 400 });
      }
      if (!verificationNotes) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
      }

      const updated = await db.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REJECTED,
          verifiedBy: userId,
          verifiedAt: new Date(),
          verificationNotes,
          proofUrl: null,
          uploadedAt: null,
          transactionNumber: null,
          amountPaid: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true,
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

      // Create notification for the SA
      const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      await db.notification.create({
        data: {
          userId: payment.userId,
          type: "SYSTEM",
          title: "Payment Rejected",
          message: `Your payment proof for ${monthNames[payment.month]} ${payment.year} was rejected. Reason: ${verificationNotes}`,
          link: "/dashboard/payments",
        },
      });

      return NextResponse.json({ payment: updated });
    }

    // Generic update (amount, etc.) for admin
    const updateData: Record<string, unknown> = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);

    if (Object.keys(updateData).length > 0) {
      const updated = await db.payment.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true,
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
    }

    return NextResponse.json({ error: "No valid action specified" }, { status: 400 });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
