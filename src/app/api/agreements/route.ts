import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id?: string })?.id;

    const searchParams = req.nextUrl.searchParams;
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const signingStatus = searchParams.get("signingStatus");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};

    // STUDENT_ASSISTANT can only see their own agreements
    if (userRole === "STUDENT_ASSISTANT") {
      where.userId = userId!;
    }

    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;

    // Signing status filter
    if (signingStatus === "fully_signed") {
      where.studentSignedAt = { not: null };
      where.supervisorSignedAt = { not: null };
    } else if (signingStatus === "pending_student") {
      where.studentSignedAt = null;
      where.supervisorSignedAt = null;
    } else if (signingStatus === "pending_supervisor") {
      where.studentSignedAt = { not: null };
      where.supervisorSignedAt = null;
    } else if (signingStatus === "not_started") {
      where.studentSignedAt = null;
    }

    // Search by SA name
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { middleName: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const [agreements, total] = await Promise.all([
      db.agreement.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
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
                  office: {
                    select: { name: true, code: true, email: true },
                  },
                },
              },
            },
          },
          studentSignature: {
            select: {
              id: true,
              signatureData: true,
              createdAt: true,
            },
          },
          supervisorSignature: {
            select: {
              id: true,
              signatureData: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.agreement.count({ where }),
    ]);

    // Compute stats
    const statsWhere: Record<string, unknown> = {};
    if (userRole === "STUDENT_ASSISTANT") {
      statsWhere.userId = userId!;
    }
    if (academicYear) statsWhere.academicYear = academicYear;
    if (semester) statsWhere.semester = semester;

    const [totalCount, fullySigned, pendingStudent, pendingSupervisor] = await Promise.all([
      db.agreement.count({ where: statsWhere }),
      db.agreement.count({
        where: { ...statsWhere, studentSignedAt: { not: null }, supervisorSignedAt: { not: null } },
      }),
      db.agreement.count({
        where: { ...statsWhere, studentSignedAt: null },
      }),
      db.agreement.count({
        where: { ...statsWhere, studentSignedAt: { not: null }, supervisorSignedAt: null },
      }),
    ]);

    return NextResponse.json({
      agreements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: totalCount,
        fullySigned,
        pendingStudent,
        pendingSupervisor,
      },
    });
  } catch (error) {
    console.error("Error fetching agreements:", error);
    return NextResponse.json({ error: "Failed to fetch agreements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ADVISER];

    if (!adminRoles.includes(userRole as UserRole)) {
      return NextResponse.json({ error: "Forbidden. Only SUPER_ADMIN or ADVISER can create agreements." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, academicYear, semester } = body;

    if (!userId || !academicYear || !semester) {
      return NextResponse.json({ error: "userId, academicYear, and semester are required" }, { status: 400 });
    }

    // Check if user exists and is a student assistant
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role !== UserRole.STUDENT_ASSISTANT) {
      return NextResponse.json({ error: "Agreements can only be created for student assistants" }, { status: 400 });
    }

    // Check if agreement already exists for this user, academic year, and semester
    const existing = await db.agreement.findUnique({
      where: {
        userId_academicYear_semester: {
          userId,
          academicYear,
          semester,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Agreement already exists for this user, academic year, and semester" }, { status: 409 });
    }

    // Generate reference number
    const refNum = `AGR-${academicYear.replace("-", "")}-${semester.charAt(0).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-4)}`;

    const agreement = await db.agreement.create({
      data: {
        userId,
        academicYear,
        semester,
        documentRefNumber: refNum,
        agreedToTerms: false,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
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

    return NextResponse.json({ agreement }, { status: 201 });
  } catch (error) {
    console.error("Error creating agreement:", error);
    return NextResponse.json({ error: "Failed to create agreement" }, { status: 500 });
  }
}
