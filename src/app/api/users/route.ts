import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole, OfficerPosition, SAStatus } from "@prisma/client";

// ============================================
// Helper: Check if the current user is authorized to manage users
// ============================================
async function isUserManager(userId: string, userRole: string): Promise<boolean> {
  // SUPER_ADMIN and ADVISER can always manage users
  if (userRole === "SUPER_ADMIN" || userRole === "ADVISER") return true;

  // OFFICER can manage users only if they are the SAS President
  if (userRole === "OFFICER") {
    const officerProfile = await db.officerProfile.findUnique({
      where: { userId },
      select: { position: true },
    });
    return officerProfile?.position === OfficerPosition.PRESIDENT;
  }

  return false;
}

// ============================================
// GET /api/users - List all users (with search/pagination)
// ============================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const canManage = await isUserManager(user.id, user.role);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};

    if (search) {
      const searchTerms = search.split(/\s+/).filter(Boolean);
      (where as Record<string, unknown>)["AND"] = searchTerms.map((term) => ({
        OR: [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { middleName: { contains: term } },
          { email: { contains: term } },
        ],
      }));
    }

    if (role && role !== "all") {
      (where as Record<string, unknown>)["role"] = role;
    }

    // Exclude PUBLIC_VISITOR and APPLICANT from results
    (where as Record<string, unknown>)["role"] = {
      ...(where["role"] && typeof where["role"] === "object" ? where["role"] : {}),
      notIn: ["PUBLIC_VISITOR", "APPLICANT"],
    };

    const total = await db.user.count({ where });

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        officerProfile: {
          select: { position: true },
        },
        profile: {
          select: {
            college: true,
            program: true,
            yearLevel: true,
            status: true,
          },
        },
      },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      middleName: u.middleName || "",
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      officerPosition: u.officerProfile?.position || null,
      saCollege: u.profile?.college || null,
      saProgram: u.profile?.program || null,
      saYearLevel: u.profile?.yearLevel || null,
      saStatus: u.profile?.status || null,
    }));

    return NextResponse.json({
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/users - Create a new user (SA, Officer, or Adviser)
// ============================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const canManage = await isUserManager(user.id, user.role);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only Super Admin, Adviser, or SAS President can add users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userType } = body as { userType: "STUDENT_ASSISTANT" | "OFFICER" | "ADVISER" };

    if (!userType || !["STUDENT_ASSISTANT", "OFFICER", "ADVISER"].includes(userType)) {
      return NextResponse.json(
        { error: "userType must be STUDENT_ASSISTANT, OFFICER, or ADVISER" },
        { status: 400 }
      );
    }

    // ── Validate required fields ──
    const { email, firstName, lastName } = body;
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "email, firstName, and lastName are required" },
        { status: 400 }
      );
    }

    // ── Check email uniqueness ──
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // ── OFFICER-specific validations ──
    if (userType === "OFFICER") {
      const { position } = body;
      if (!position) {
        return NextResponse.json(
          { error: "position is required for OFFICER type" },
          { status: 400 }
        );
      }
      if (position === "PRESIDENT") {
        return NextResponse.json(
          { error: "PRESIDENT position is reserved and cannot be assigned" },
          { status: 400 }
        );
      }
      if (!Object.values(OfficerPosition).includes(position as OfficerPosition)) {
        return NextResponse.json(
          { error: `Invalid officer position: ${position}` },
          { status: 400 }
        );
      }
    }

    // ── Resolve office ──
    let resolvedOfficeId: string | null = null;
    if (userType !== "ADVISER") {
      const { officeId, customOffice } = body;
      if (customOffice && typeof customOffice === "string" && customOffice.trim()) {
        const trimmedName = customOffice.trim();
        const code = trimmedName
          .split(/\s+/)
          .filter(Boolean)
          .map((word: string) => word.charAt(0).toUpperCase())
          .join("");

        const existingOffice = await db.office.findFirst({
          where: { name: trimmedName },
        });
        if (existingOffice) {
          resolvedOfficeId = existingOffice.id;
        } else {
          const newOffice = await db.office.create({
            data: { name: trimmedName, code },
          });
          resolvedOfficeId = newOffice.id;
        }
      } else if (officeId) {
        const office = await db.office.findUnique({ where: { id: officeId } });
        if (!office) {
          return NextResponse.json(
            { error: "Selected office not found" },
            { status: 400 }
          );
        }
        resolvedOfficeId = officeId;
      }
    }

    // ── Determine password and role ──
    let defaultPassword: string;
    let dbRole: UserRole;

    switch (userType) {
      case "STUDENT_ASSISTANT":
        dbRole = UserRole.STUDENT_ASSISTANT;
        defaultPassword = "UMAKSAS_SA_2026";
        break;
      case "OFFICER":
        dbRole = UserRole.OFFICER;
        defaultPassword = "UMAKSAS_OFFICER_2026";
        break;
      case "ADVISER":
        dbRole = UserRole.ADVISER;
        defaultPassword = "UMAKSAS_ADVISER_2026";
        break;
    }

    const {
      middleName,
      suffix,
      phone,
      studentNumber,
      college,
      program,
      yearLevel,
      sex,
      dateOfBirth,
      position,
    } = body;

    // ── Create user in a transaction ──
    const newUser = await db.$transaction(async (tx) => {
      // Create the user
      const createdUser = await tx.user.create({
        data: {
          email,
          password: defaultPassword,
          firstName,
          lastName,
          middleName: middleName || null,
          suffix: suffix || null,
          phone: phone || null,
          role: dbRole,
          isActive: true,
          // Officer profile (for OFFICER and ADVISER types)
          ...(userType === "OFFICER" && {
            officerProfile: {
              create: {
                position: position as OfficerPosition,
              },
            },
          }),
          ...(userType === "ADVISER" && {
            officerProfile: {
              create: {
                position: OfficerPosition.ADVISER,
              },
            },
          }),
        },
        include: {
          officerProfile: true,
        },
      });

      // Create SA profile for STUDENT_ASSISTANT and OFFICER types
      if (userType === "STUDENT_ASSISTANT" || userType === "OFFICER") {
        await tx.sAProfile.create({
          data: {
            userId: createdUser.id,
            studentNumber: studentNumber || null,
            college: college || null,
            program: program || null,
            yearLevel: yearLevel || null,
            sex: sex || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            officeId: resolvedOfficeId,
            status: SAStatus.ACTIVE,
          },
        });
      }

      return createdUser;
    });

    // ── Create notification preferences (non-critical) ──
    try {
      await db.notificationPreference.create({
        data: { userId: newUser.id },
      });
    } catch (prefError) {
      console.error("Warning: Could not create notification preferences:", prefError);
    }

    // ── Create activity log ──
    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE_USER",
          entityType: "User",
          entityId: newUser.id,
          details: `Created ${userType} user: ${newUser.email} (${newUser.firstName} ${newUser.lastName})`,
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json(
      {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        defaultPassword,
        officerPosition: newUser.officerProfile?.position || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
