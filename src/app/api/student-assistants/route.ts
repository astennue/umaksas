import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SAStatus, UserRole } from "@prisma/client";

// GET /api/student-assistants - List all SAs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const college = searchParams.get("college") || "";
    const office = searchParams.get("office") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {
      user: {
        role: { in: [UserRole.STUDENT_ASSISTANT, UserRole.OFFICER, UserRole.ADVISER] },
      },
    };

    if (search) {
      const searchTerms = search.split(/\s+/);
      where["AND"] = searchTerms.map((term) => ({
        OR: [
          { user: { firstName: { contains: term } } },
          { user: { lastName: { contains: term } } },
          { user: { email: { contains: term } } },
          { college: { contains: term } },
          { office: { name: { contains: term } } },
        ],
      }));
    }

    if (college && college !== "all") {
      where["college"] = college;
    }

    if (office && office !== "all") {
      where["office"] = { name: office };
    }

    if (status && status !== "all") {
      where["status"] = status as SAStatus;
    }

    const [profiles, total] = await Promise.all([
      db.sAProfile.findMany({
        where,
        orderBy: { user: { firstName: "asc" } },
        skip: (page - 1) * limit,
        take: limit,
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
              isActive: true,
            },
          },
          office: {
            select: {
              id: true,
              name: true,
              code: true,
              email: true,
            },
          },
        },
      }),
      db.sAProfile.count({ where }),
    ]);

    const result = profiles.map((profile) => ({
      id: profile.userId,
      profileId: profile.id,
      firstName: profile.user.firstName || "",
      lastName: profile.user.lastName || "",
      middleName: profile.user.middleName || "",
      email: profile.user.email,
      phone: profile.user.phone,
      photoUrl: profile.user.photoUrl,
      isActive: profile.user.isActive,
      studentNumber: profile.studentNumber,
      college: profile.college,
      program: profile.program,
      yearLevel: profile.yearLevel,
      status: profile.status,
      officeId: profile.officeId,
      officeName: profile.office?.name || null,
      officeCode: profile.office?.code || null,
      isOnDuty: profile.isOnDuty,
      lastClockIn: profile.lastClockIn?.toISOString() || null,
      totalHoursWorked: profile.totalHoursWorked,
      hoursThisSemester: profile.hoursThisSemester,
      dateHired: profile.dateHired?.toISOString() || null,
    }));

    return NextResponse.json({
      studentAssistants: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching student assistants:", error);
    return NextResponse.json(
      { error: "Failed to fetch student assistants" },
      { status: 500 }
    );
  }
}

// POST /api/student-assistants - Create new SA (SUPER_ADMIN, ADVISER only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (!["SUPER_ADMIN", "ADVISER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin or Adviser can create student assistants" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      college,
      program,
      yearLevel,
      officeId,
      customOffice,
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "firstName, lastName, and email are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Resolve officeId: customOffice takes precedence over officeId
    let resolvedOfficeId = officeId || null;
    if (customOffice && typeof customOffice === "string" && customOffice.trim()) {
      const trimmedName = customOffice.trim();
      // Generate code from first letters of each word
      const code = trimmedName
        .split(/\s+/)
        .filter(Boolean)
        .map((word: string) => word.charAt(0).toUpperCase())
        .join("");

      // Check if an office with this name already exists
      const existingOffice = await db.office.findFirst({
        where: { name: trimmedName },
      });

      if (existingOffice) {
        resolvedOfficeId = existingOffice.id;
      } else {
        // Create a new office
        const newOffice = await db.office.create({
          data: {
            name: trimmedName,
            code,
          },
        });
        resolvedOfficeId = newOffice.id;
      }
    } else if (officeId) {
      // Check office exists
      const office = await db.office.findUnique({ where: { id: officeId } });
      if (!office) {
        return NextResponse.json(
          { error: "Selected office not found" },
          { status: 400 }
        );
      }
    }

    // Create user, profile, and notification preferences atomically in a transaction
    const [newUser] = await db.$transaction([
      db.user.create({
        data: {
          email,
          password: password || `UMAKSA@${lastName}_2026`,
          firstName,
          lastName,
          phone: phone || null,
          role: UserRole.STUDENT_ASSISTANT,
          isActive: true,
          profile: {
            create: {
              college: college || null,
              program: program || null,
              yearLevel: yearLevel || null,
              officeId: resolvedOfficeId,
              status: SAStatus.ACTIVE,
            },
          },
        },
        include: {
          profile: {
            include: {
              office: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      }),
    ]);

    // Create notification preferences (outside transaction is fine since it's not critical)
    try {
      await db.notificationPreference.create({
        data: { userId: newUser.id },
      });
    } catch (prefError) {
      console.error("Warning: Could not create notification preferences:", prefError);
    }

    return NextResponse.json(
      {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        profile: newUser.profile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student assistant:", error);
    return NextResponse.json(
      { error: "Failed to create student assistant" },
      { status: 500 }
    );
  }
}
