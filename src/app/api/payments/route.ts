import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PaymentStatus, UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // RBAC: SUPER_ADMIN, ADVISER, OFFICER, STUDENT_ASSISTANT can view payments
    // HRMO, OFFICE_SUPERVISOR, PUBLIC cannot access
    const authResult = await requireRole([
      UserRole.SUPER_ADMIN,
      UserRole.ADVISER,
      UserRole.OFFICER,
      UserRole.STUDENT_ASSISTANT,
    ]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;
    const userRole = user.role;
    const userId = user.id;

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";

    // STUDENT_ASSISTANT can only see their own payments
    if (userRole === "STUDENT_ASSISTANT") {
      const where: Record<string, unknown> = {
        userId: userId!,
      };

      if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        where.status = status;
      }
      if (month) where.month = parseInt(month, 10);
      if (year) where.year = parseInt(year, 10);

      const [payments, total] = await Promise.all([
        db.payment.findMany({
          where,
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
          orderBy: [{ year: "desc" }, { month: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.payment.count({ where }),
      ]);

      return NextResponse.json({
        payments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // SUPER_ADMIN, ADVISER, OFFICER can see all payments
    const where: Record<string, unknown> = {};

    if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      where.status = status;
    }
    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
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
                  yearLevel: true,
                  office: {
                    select: { name: true, code: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.HRMO, UserRole.OFFICER, UserRole.ADVISER];

    if (!adminRoles.includes(userRole as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, month, year, amount } = body;

    if (!userId || !month || !year) {
      return NextResponse.json({ error: "userId, month, and year are required" }, { status: 400 });
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Month must be between 1 and 12" }, { status: 400 });
    }

    // Check if payment already exists
    const existing = await db.payment.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: parseInt(month, 10),
          year: parseInt(year, 10),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Payment already exists for this user, month, and year" }, { status: 409 });
    }

    // Generate reference number
    const refNum = `PAY-${year}${String(month).padStart(2, "0")}-${Date.now().toString(36).toUpperCase()}`;

    const payment = await db.payment.create({
      data: {
        userId,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        amount: amount ? parseFloat(amount) : 20.0,
        referenceNumber: refNum,
        status: PaymentStatus.UNPAID,
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

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
