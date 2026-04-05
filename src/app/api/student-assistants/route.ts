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

    // Build where clause for SA profiles
    const profileWhere: Record<string, unknown> = {
      user: {
        role: { in: [UserRole.STUDENT_ASSISTANT, UserRole.OFFICER] },
        isActive: true,
      },
      status: "ACTIVE",
    };

    if (search) {
      const searchTerms = search.split(/\s+/).filter(Boolean);
      profileWhere["AND"] = searchTerms.map((term) => ({
        OR: [
          { user: { firstName: { contains: term } } },
          { user: { lastName: { contains: term } } },
          { user: { middleName: { contains: term } } },
          { user: { email: { contains: term } } },
          { college: { contains: term } },
          { office: { name: { contains: term } } },
        ],
      }));
    }

    if (college && college !== "all") {
      profileWhere["college"] = college;
    }

    if (office && office !== "all") {
      profileWhere["office"] = { name: office };
    }

    if (status && status !== "all") {
      profileWhere["status"] = status as SAStatus;
    }

    // =============================================
    // QUERY 1: SAs with active SA profiles (includes officers who have profiles)
    // =============================================
    const profiles = await db.sAProfile.findMany({
      where: profileWhere,
      orderBy: { user: { firstName: "asc" } },
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
            role: true,
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
    });

    const profileUserIds = new Set(profiles.map((p) => p.userId));

    // =============================================
    // QUERY 2: Officers WITHOUT SA profiles
    // (officers who were promoted but never had an SA profile created)
    // =============================================
    const officerWhere: Record<string, unknown> = {
      role: UserRole.OFFICER,
      isActive: true,
      ...(profileUserIds.size > 0 && { id: { notIn: [...profileUserIds] } }),
    };

    if (search) {
      const searchTerms = search.split(/\s+/).filter(Boolean);
      (officerWhere as Record<string, unknown>)["AND"] = searchTerms.map((term) => ({
        OR: [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { middleName: { contains: term } },
          { email: { contains: term } },
        ],
      }));
    }

    const officersWithoutProfiles = await db.user.findMany({
      where: officerWhere,
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        phone: true,
        photoUrl: true,
        isActive: true,
        role: true,
        officerProfile: {
          select: {
            position: true,
          },
        },
      },
    });

    // =============================================
    // MERGE RESULTS
    // =============================================
    const formatProfile = (profile: typeof profiles[0]) => ({
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
      isOfficer: profile.user.role === UserRole.OFFICER,
      officerPosition: profile.user.role === UserRole.OFFICER ? "Student Assistant" : null,
    });

    const formatOfficer = (officer: typeof officersWithoutProfiles[0]) => ({
      id: officer.id,
      profileId: null,
      firstName: officer.firstName || "",
      lastName: officer.lastName || "",
      middleName: officer.middleName || "",
      email: officer.email,
      phone: officer.phone,
      photoUrl: officer.photoUrl,
      isActive: officer.isActive,
      studentNumber: null,
      college: null,
      program: null,
      yearLevel: null,
      status: "ACTIVE" as string,
      officeId: null,
      officeName: null,
      officeCode: null,
      isOnDuty: false,
      lastClockIn: null,
      totalHoursWorked: 0,
      hoursThisSemester: 0,
      dateHired: null,
      isOfficer: true,
      officerPosition: officer.officerProfile?.position || null,
    });

    const allResults = [
      ...profiles.map(formatProfile),
      ...officersWithoutProfiles.map(formatOfficer),
    ];

    // Sort combined results by first name
    allResults.sort((a, b) => a.firstName.localeCompare(b.firstName));

    const total = allResults.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedResults = allResults.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      studentAssistants: paginatedResults,
      total,
      page,
      limit,
      totalPages,
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
