import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SAStatus, UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const college = searchParams.get("college") || "";
    const office = searchParams.get("office") || "";
    const sex = searchParams.get("sex") || "";
    const sort = searchParams.get("sort") || "name";

    // Fetch system settings for academic year and semester
    let systemSettings: { academicYear: string | null; currentSemester: string | null } | null = null;
    try {
      systemSettings = await db.systemSettings.findFirst({
        select: {
          academicYear: true,
          currentSemester: true,
        },
      });
    } catch {
      // If system settings table doesn't exist or is empty, use defaults
    }

    const academicYear = systemSettings?.academicYear || null;
    const semester = systemSettings?.currentSemester || null;

    // =============================================
    // QUERY 1: SAs with active SA profiles (includes officers who have profiles)
    // =============================================
    const profileWhere: Record<string, unknown> = {
      user: {
        role: { in: [UserRole.STUDENT_ASSISTANT, UserRole.OFFICER] },
        isActive: true,
      },
      status: SAStatus.ACTIVE,
    };

    // Search filter
    if (search) {
      const searchTerms = search.split(/\s+/).filter(Boolean);
      profileWhere["AND"] = searchTerms.map((term) => ({
        OR: [
          { user: { firstName: { contains: term } } },
          { user: { lastName: { contains: term } } },
          { user: { middleName: { contains: term } } },
          { college: { contains: term } },
          { office: { name: { contains: term } } },
          { program: { contains: term } },
          { studentNumber: { contains: term } } as Record<string, unknown>,
        ],
      }));
    }

    if (college && college !== "all") {
      profileWhere["college"] = college;
    }
    if (office && office !== "all") {
      profileWhere["office"] = { name: office };
    }
    if (sex && sex !== "all") {
      profileWhere["sex"] = sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
    }

    // Build order by
    let orderBy: Record<string, unknown> = {};
    switch (sort) {
      case "college":
        orderBy = { college: "asc" };
        break;
      case "office":
        orderBy = { office: { name: "asc" } };
        break;
      case "name":
      default:
        orderBy = { user: { firstName: "asc" } };
        break;
    }

    // Fetch SAs with active profiles
    const profiles = await db.sAProfile.findMany({
      where: profileWhere,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        office: {
          select: {
            name: true,
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
      firstName: profile.user.firstName || "",
      lastName: profile.user.lastName || "",
      college: profile.college || null,
      officeName: profile.office?.name || null,
      officeEmail: profile.office?.email || null,
      isOnDuty: profile.isOnDuty,
      lastClockIn: profile.lastClockIn?.toISOString() || null,
      academicYear,
      semester,
      studentNumber: profile.studentNumber || null,
      dateHired: profile.dateHired?.toISOString() || null,
      totalHoursWorked: profile.totalHoursWorked,
      hoursThisSemester: profile.hoursThisSemester,
      yearLevel: profile.yearLevel || null,
      program: profile.program || null,
      employeeId: profile.employeeId || null,
      phone: profile.user.phone || null,
      dateOfBirth: profile.dateOfBirth?.toISOString() || null,
      age: profile.age || null,
      sex: profile.sex || null,
      courtesyTitle: profile.courtesyTitle || null,
      contactNumber: profile.contactNumber || null,
      personalEmail: profile.personalEmail || null,
      umakEmail: profile.user.email || null,
      isOfficer: profile.user.role === UserRole.OFFICER,
      officerPosition: profile.user.role === UserRole.OFFICER ? "Student Assistant" : null,
    });

    const formatOfficer = (officer: typeof officersWithoutProfiles[0]) => ({
      id: officer.id,
      firstName: officer.firstName || "",
      lastName: officer.lastName || "",
      college: null,
      officeName: null,
      officeEmail: null,
      isOnDuty: false,
      lastClockIn: null,
      academicYear,
      semester,
      studentNumber: null,
      dateHired: null,
      totalHoursWorked: 0,
      hoursThisSemester: 0,
      yearLevel: null,
      program: null,
      employeeId: null,
      phone: officer.phone || null,
      dateOfBirth: null,
      age: null,
      sex: null,
      courtesyTitle: null,
      contactNumber: null,
      personalEmail: null,
      umakEmail: officer.email || null,
      isOfficer: true,
      officerPosition: officer.officerProfile?.position || null,
    });

    const allResults = [
      ...profiles.map(formatProfile),
      ...officersWithoutProfiles.map(formatOfficer),
    ];

    // Sort combined results
    allResults.sort((a, b) => {
      switch (sort) {
        case "college":
          return (a.college || "").localeCompare(b.college || "");
        case "office":
          return (a.officeName || "").localeCompare(b.officeName || "");
        case "name":
        default:
          return a.firstName.localeCompare(b.firstName);
      }
    });

    return NextResponse.json(allResults);
  } catch (error) {
    console.error("Error fetching SA Wall data:", error);
    return NextResponse.json(
      { error: "Failed to fetch student assistants" },
      { status: 500 }
    );
  }
}
