import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaymentStatus, UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.HRMO];

    if (!adminRoles.includes(userRole as UserRole)) {
      return NextResponse.json({ error: "Forbidden - Only SUPER_ADMIN and HRMO can generate bulk payments" }, { status: 403 });
    }

    const body = await req.json();
    const { month, year, amount } = body;

    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Month must be between 1 and 12" }, { status: 400 });
    }

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);
    const parsedAmount = amount ? parseFloat(amount) : 20.0;

    // Get all active SAs
    const activeSAs = await db.user.findMany({
      where: {
        role: UserRole.STUDENT_ASSISTANT,
        isActive: true,
        profile: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
      },
    });

    if (activeSAs.length === 0) {
      return NextResponse.json({ error: "No active student assistants found" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const notifiedUserIds: string[] = [];

    for (const sa of activeSAs) {
      try {
        // Check if payment already exists
        const existing = await db.payment.findUnique({
          where: {
            userId_month_year: {
              userId: sa.id,
              month: parsedMonth,
              year: parsedYear,
            },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const refNum = `PAY-${parsedYear}${String(parsedMonth).padStart(2, "0")}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await db.payment.create({
          data: {
            userId: sa.id,
            month: parsedMonth,
            year: parsedYear,
            amount: parsedAmount,
            referenceNumber: refNum,
            status: PaymentStatus.UNPAID,
          },
        });

        created++;
        notifiedUserIds.push(sa.id);
      } catch (err) {
        errors.push(`Failed to create payment for user ${sa.id}`);
      }
    }

    // Create notifications for all SAs about new payment
    const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    await db.notification.createMany({
      data: activeSAs
        .filter((sa) => notifiedUserIds.includes(sa.id))
        .map((sa) => ({
          userId: sa.id,
          type: "PAYMENT_DUE" as const,
          title: "Monthly Payment Due",
          message: `Payment of ₱${parsedAmount.toFixed(2)} for ${monthNames[parsedMonth]} ${parsedYear} is now due. Please upload your proof of payment.`,
          link: "/dashboard/payments",
        })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: "Bulk payment generation completed",
      created,
      skipped,
      total: activeSAs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error generating bulk payments:", error);
    return NextResponse.json({ error: "Failed to generate bulk payments" }, { status: 500 });
  }
}
