import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/hr-onboarding - List onboarding records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["SUPER_ADMIN", "HRMO"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin and HRMO can view onboarding records" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isVerified = searchParams.get("isVerified");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      const searchTerms = search.split(/\s+/);
      where["AND"] = searchTerms.map((term) => ({
        OR: [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { middleName: { contains: term } },
          { email: { contains: term } },
          { employeeId: { contains: term } },
          { position: { contains: term } },
        ],
      }));
    }

    if (isVerified !== null && isVerified !== undefined && isVerified !== "") {
      where["isVerified"] = isVerified === "true";
    }

    const [records, total] = await Promise.all([
      db.hROnboarding.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
              role: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  office: {
                    select: { id: true, name: true, code: true },
                  },
                },
              },
            },
          },
        },
      }),
      db.hROnboarding.count({ where }),
    ]);

    // Compute stats
    const [allRecords, thisMonthCount] = await Promise.all([
      db.hROnboarding.count(),
      db.hROnboarding.count({
        where: {
          dateHired: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    const verifiedCount = await db.hROnboarding.count({
      where: { isVerified: true },
    });

    const result = records.map((record) => ({
      id: record.id,
      userId: record.userId,
      employeeId: record.employeeId,
      employeeType: record.employeeType,
      firstName: record.firstName || record.user.firstName || "",
      lastName: record.lastName || record.user.lastName || "",
      middleName: record.middleName || record.user.middleName || "",
      email: record.email || record.user.email || "",
      phone: record.phone || record.user.phone || "",
      dateOfBirth: record.dateOfBirth?.toISOString() || null,
      gender: record.gender || null,
      civilStatus: record.civilStatus || null,
      citizenship: record.citizenship || null,
      religion: record.religion || null,
      address: record.address || null,
      emergencyName: record.emergencyName || null,
      emergencyRelation: record.emergencyRelation || null,
      emergencyContact: record.emergencyContact || null,
      dateHired: record.dateHired?.toISOString() || null,
      officeId: record.officeId || null,
      position: record.position || null,
      isVerified: record.isVerified,
      verifiedAt: record.verifiedAt?.toISOString() || null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      userPhotoUrl: record.user.photoUrl || null,
      userRole: record.user.role,
      userCollege: record.user.profile?.college || null,
      userOffice: record.user.profile?.office?.name || null,
    }));

    return NextResponse.json({
      records: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalRecords: allRecords,
        verified: verifiedCount,
        pending: allRecords - verifiedCount,
        hiredThisMonth: thisMonthCount,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding records:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding records" },
      { status: 500 }
    );
  }
}

// POST /api/hr-onboarding - Create or update onboarding record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["SUPER_ADMIN", "HRMO"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin and HRMO can manage onboarding records" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      employeeId,
      employeeType,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      civilStatus,
      citizenship,
      religion,
      email,
      phone,
      address,
      emergencyName,
      emergencyRelation,
      emergencyContact,
      dateHired,
      officeId,
      position,
    } = body;

    // Verify user exists if userId provided
    if (userId) {
      const existingUser = await db.user.findUnique({
        where: { id: userId },
        include: { hrOnboarding: true, profile: true },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Check if office exists
      if (officeId) {
        const office = await db.office.findUnique({ where: { id: officeId } });
        if (!office) {
          return NextResponse.json(
            { error: "Office not found" },
            { status: 404 }
          );
        }
      }

      // Check if employeeId is unique
      if (employeeId) {
        const existingEmployeeId = await db.hROnboarding.findUnique({
          where: { employeeId },
        });
        if (existingEmployeeId && existingEmployeeId.userId !== userId) {
          return NextResponse.json(
            { error: "Employee ID already in use" },
            { status: 409 }
          );
        }
      }

      // Upsert onboarding record
      const onboarding = await db.hROnboarding.upsert({
        where: { userId },
        update: {
          employeeId: employeeId || undefined,
          employeeType: employeeType || "Student Assistant",
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          middleName: middleName || undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender: gender || undefined,
          civilStatus: civilStatus || undefined,
          citizenship: citizenship || undefined,
          religion: religion || undefined,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          emergencyName: emergencyName || undefined,
          emergencyRelation: emergencyRelation || undefined,
          emergencyContact: emergencyContact || undefined,
          dateHired: dateHired ? new Date(dateHired) : undefined,
          officeId: officeId || undefined,
          position: position || undefined,
        },
        create: {
          userId,
          employeeId: employeeId || null,
          employeeType: employeeType || "Student Assistant",
          firstName: firstName || existingUser.firstName || null,
          lastName: lastName || existingUser.lastName || null,
          middleName: middleName || existingUser.middleName || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          civilStatus: civilStatus || null,
          citizenship: citizenship || null,
          religion: religion || null,
          email: email || existingUser.email || null,
          phone: phone || existingUser.phone || null,
          address: address || null,
          emergencyName: emergencyName || null,
          emergencyRelation: emergencyRelation || null,
          emergencyContact: emergencyContact || null,
          dateHired: dateHired ? new Date(dateHired) : existingUser.profile?.dateHired || null,
          officeId: officeId || existingUser.profile?.officeId || null,
          position: position || null,
        },
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
            },
          },
        },
      });

      // Update user profile with dateHired and officeId if provided
      if (dateHired || officeId) {
        if (existingUser.profile) {
          await db.sAProfile.update({
            where: { userId },
            data: {
              ...(dateHired ? { dateHired: new Date(dateHired) } : {}),
              ...(officeId ? { officeId } : {}),
              ...(employeeId ? { employeeId } : {}),
            },
          });
        } else {
          // Create profile if doesn't exist
          await db.sAProfile.create({
            data: {
              userId,
              ...(dateHired ? { dateHired: new Date(dateHired) } : {}),
              ...(officeId ? { officeId } : {}),
              ...(employeeId ? { employeeId } : {}),
            },
          });
        }
      }

      return NextResponse.json({
        id: onboarding.id,
        userId: onboarding.userId,
        ...onboarding,
      });
    }

    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating/updating onboarding record:", error);
    return NextResponse.json(
      { error: "Failed to create/update onboarding record" },
      { status: 500 }
    );
  }
}
