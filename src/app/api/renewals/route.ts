import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/renewals - List renewals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // STUDENT_ASSISTANT can only see their own renewal
    if (user.role === "STUDENT_ASSISTANT") {
      where.userId = user.id;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by academic year
    if (academicYear) {
      where.academicYear = academicYear;
    }

    // Filter by semester
    if (semester) {
      where.semester = semester;
    }

    // Search by SA name, email, college
    if (search && ["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(user.role)) {
      where.user = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { profile: { college: { contains: search } } },
        ],
      };
    }

    const [renewals, total] = await Promise.all([
      db.renewal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  yearLevel: true,
                  studentNumber: true,
                  officeId: true,
                  office: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
          newOffice: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.renewal.count({ where }),
    ]);

    return NextResponse.json({
      renewals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching renewals:", error);
    return NextResponse.json(
      { error: "Failed to fetch renewals" },
      { status: 500 }
    );
  }
}

// POST /api/renewals - Create or update renewal (STUDENT_ASSISTANT for own, SUPER_ADMIN for any)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    const body = await request.json();
    const {
      userId: targetUserId,
      statementOfIntent,
      availabilityJson,
      requestTransfer,
      transferReason,
      newOfficeId,
      intentLetterUrl,
      reportOfGradeUrl,
      corUrl,
    } = body;

    // Determine target user
    const isStudent = user.role === "STUDENT_ASSISTANT";
    const isAdmin = user.role === "SUPER_ADMIN";

    if (!isStudent && !isAdmin) {
      return NextResponse.json(
        { error: "Only Student Assistants or Super Admins can submit renewals" },
        { status: 403 }
      );
    }

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : user.id;

    // Check if renewal season is open (only for students)
    if (isStudent) {
      const settings = await db.systemSettings.findFirst();
      if (!settings?.renewalOpen) {
        return NextResponse.json(
          { error: "Renewal season is not currently open" },
          { status: 400 }
        );
      }
    }

    // Check if user already has a renewal
    const existingRenewal = await db.renewal.findUnique({
      where: { userId: effectiveUserId },
    });

    if (existingRenewal) {
      // If it's REQUIRES_CHANGES, allow re-submission
      if (existingRenewal.status === "REQUIRES_CHANGES") {
        // Continue to update below
      } else {
        return NextResponse.json(
          { error: "A renewal already exists for this user. Reference: " + existingRenewal.id },
          { status: 400 }
        );
      }
    }

    // Validate statement of intent
    if (!statementOfIntent || statementOfIntent.trim().length < 20) {
      return NextResponse.json(
        { error: "Statement of intent is required (at least 20 characters)" },
        { status: 400 }
      );
    }

    // Validate required documents
    if (!reportOfGradeUrl) {
      return NextResponse.json(
        { error: "Report of grades is required" },
        { status: 400 }
      );
    }
    if (!corUrl) {
      return NextResponse.json(
        { error: "Certificate of Registration (COR) is required" },
        { status: 400 }
      );
    }

    // Validate transfer fields
    if (requestTransfer) {
      if (!transferReason) {
        return NextResponse.json(
          { error: "Transfer reason is required when requesting transfer" },
          { status: 400 }
        );
      }
      if (!newOfficeId) {
        return NextResponse.json(
          { error: "New office selection is required when requesting transfer" },
          { status: 400 }
        );
      }

      // Verify new office exists and is active
      const office = await db.office.findUnique({
        where: { id: newOfficeId },
      });
      if (!office || !office.isActive) {
        return NextResponse.json(
          { error: "Selected office is not available" },
          { status: 400 }
        );
      }
    }

    // Get system settings for academic year/semester
    const settings = await db.systemSettings.findFirst();

    // If there's a pending renewal with REQUIRES_CHANGES, update it
    if (existingRenewal && existingRenewal.status === "REQUIRES_CHANGES") {
      const updated = await db.renewal.update({
        where: { id: existingRenewal.id },
        data: {
          statementOfIntent: statementOfIntent || existingRenewal.statementOfIntent,
          availabilityJson: availabilityJson || existingRenewal.availabilityJson,
          requestTransfer: requestTransfer ?? existingRenewal.requestTransfer,
          transferReason: requestTransfer ? transferReason : null,
          newOfficeId: requestTransfer ? newOfficeId : null,
          intentLetterUrl: intentLetterUrl || existingRenewal.intentLetterUrl,
          reportOfGradeUrl,
          corUrl,
          status: "PENDING_REVIEW",
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          submittedAt: new Date(),
          academicYear: settings?.academicYear || existingRenewal.academicYear,
          semester: settings?.currentSemester || existingRenewal.semester,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  yearLevel: true,
                  studentNumber: true,
                  office: {
                    select: { name: true, code: true },
                  },
                },
              },
            },
          },
          newOffice: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      return NextResponse.json({
        renewal: updated,
        message: "Renewal updated and resubmitted successfully",
      });
    }

    // Create new renewal
    const renewal = await db.renewal.create({
      data: {
        userId: effectiveUserId,
        statementOfIntent: statementOfIntent || null,
        availabilityJson: availabilityJson || null,
        requestTransfer: requestTransfer ?? false,
        transferReason: requestTransfer ? transferReason : null,
        newOfficeId: requestTransfer ? newOfficeId : null,
        intentLetterUrl: intentLetterUrl || null,
        reportOfGradeUrl,
        corUrl,
        status: "PENDING_REVIEW",
        submittedAt: new Date(),
        academicYear: settings?.academicYear || null,
        semester: settings?.currentSemester || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            profile: {
              select: {
                college: true,
                program: true,
                yearLevel: true,
                studentNumber: true,
                office: {
                  select: { name: true, code: true },
                },
              },
            },
          },
        },
        newOffice: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json(
      {
        renewal,
        message: "Renewal submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating renewal:", error);
    return NextResponse.json(
      { error: "Failed to create renewal" },
      { status: 500 }
    );
  }
}
