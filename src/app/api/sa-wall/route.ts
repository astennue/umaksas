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

    // Build where clause
    const where: Record<string, unknown> = {
      user: {
        role: UserRole.STUDENT_ASSISTANT,
        isActive: true,
      },
      status: SAStatus.ACTIVE,
    };

    // Search filter (name, college, office) - case-insensitive for PostgreSQL
    if (search) {
      const searchTerms = search.split(/\s+/).filter(Boolean);
      where["AND"] = searchTerms.map((term) => ({
        OR: [
          { user: { firstName: { contains: term, mode: "insensitive" } } },
          { user: { lastName: { contains: term, mode: "insensitive" } } },
          { user: { middleName: { contains: term, mode: "insensitive" } } },
          { college: { contains: term, mode: "insensitive" } },
          { office: { name: { contains: term, mode: "insensitive" } } },
          { program: { contains: term, mode: "insensitive" } },
          { studentNumber: { contains: term, mode: "insensitive" } } as Record<string, unknown>,
        ],
      }));
    }

    // College filter
    if (college && college !== "all") {
      where["college"] = college;
    }

    // Office filter
    if (office && office !== "all") {
      where["office"] = {
        name: office,
      };
    }

    // Sex filter
    if (sex && sex !== "all") {
      where["sex"] = sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
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

    // Fetch SAs with their profiles and offices
    const profiles = await db.sAProfile.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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

    // Map to response format
    const result = profiles.map((profile) => ({
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
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching SA Wall data:", error);
    return NextResponse.json(
      { error: "Failed to fetch student assistants" },
      { status: 500 }
    );
  }
}
