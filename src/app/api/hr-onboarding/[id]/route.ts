import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/hr-onboarding/[id] - Get onboarding detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const record = await db.hROnboarding.findUnique({
      where: { id },
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
                yearLevel: true,
                studentNumber: true,
                employeeId: true,
                office: {
                  select: { id: true, name: true, code: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Onboarding record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: record.id,
      userId: record.userId,
      employeeId: record.employeeId,
      employeeType: record.employeeType,
      firstName: record.firstName || record.user.firstName || "",
      lastName: record.lastName || record.user.lastName || "",
      middleName: record.middleName || record.user.middleName || "",
      dateOfBirth: record.dateOfBirth?.toISOString() || null,
      gender: record.gender || null,
      civilStatus: record.civilStatus || null,
      citizenship: record.citizenship || null,
      religion: record.religion || null,
      email: record.email || record.user.email || "",
      phone: record.phone || record.user.phone || "",
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
      userProgram: record.user.profile?.program || null,
      userYearLevel: record.user.profile?.yearLevel || null,
      userStudentNumber: record.user.profile?.studentNumber || null,
      userEmployeeId: record.user.profile?.employeeId || null,
      userOffice: record.user.profile?.office || null,
    });
  } catch (error) {
    console.error("Error fetching onboarding record:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding record" },
      { status: 500 }
    );
  }
}

// PUT /api/hr-onboarding/[id] - Update onboarding record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["SUPER_ADMIN", "HRMO"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin and HRMO can update onboarding records" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if record exists
    const existing = await db.hROnboarding.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Onboarding record not found" },
        { status: 404 }
      );
    }

    const {
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
      action,
    } = body;

    // Handle verify action
    if (action === "verify") {
      const updated = await db.hROnboarding.update({
        where: { id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      return NextResponse.json({
        id: updated.id,
        isVerified: updated.isVerified,
        verifiedAt: updated.verifiedAt?.toISOString(),
      });
    }

    // Check if employeeId is unique (if changing)
    if (employeeId && employeeId !== existing.employeeId) {
      const existingEmployeeId = await db.hROnboarding.findUnique({
        where: { employeeId },
      });
      if (existingEmployeeId) {
        return NextResponse.json(
          { error: "Employee ID already in use" },
          { status: 409 }
        );
      }
    }

    // Check office exists
    if (officeId) {
      const office = await db.office.findUnique({ where: { id: officeId } });
      if (!office) {
        return NextResponse.json(
          { error: "Office not found" },
          { status: 404 }
        );
      }
    }

    const updated = await db.hROnboarding.update({
      where: { id },
      data: {
        ...(employeeId !== undefined ? { employeeId: employeeId || null } : {}),
        ...(employeeType !== undefined ? { employeeType } : {}),
        ...(firstName !== undefined ? { firstName: firstName || null } : {}),
        ...(lastName !== undefined ? { lastName: lastName || null } : {}),
        ...(middleName !== undefined ? { middleName: middleName || null } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
        ...(gender !== undefined ? { gender: gender || null } : {}),
        ...(civilStatus !== undefined ? { civilStatus: civilStatus || null } : {}),
        ...(citizenship !== undefined ? { citizenship: citizenship || null } : {}),
        ...(religion !== undefined ? { religion: religion || null } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(emergencyName !== undefined ? { emergencyName: emergencyName || null } : {}),
        ...(emergencyRelation !== undefined ? { emergencyRelation: emergencyRelation || null } : {}),
        ...(emergencyContact !== undefined ? { emergencyContact: emergencyContact || null } : {}),
        ...(dateHired !== undefined ? { dateHired: dateHired ? new Date(dateHired) : null } : {}),
        ...(officeId !== undefined ? { officeId: officeId || null } : {}),
        ...(position !== undefined ? { position: position || null } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      ...updated,
    });
  } catch (error) {
    console.error("Error updating onboarding record:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding record" },
      { status: 500 }
    );
  }
}

// DELETE /api/hr-onboarding/[id] - Delete onboarding record (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can delete onboarding records" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.hROnboarding.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Onboarding record not found" },
        { status: 404 }
      );
    }

    await db.hROnboarding.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Onboarding record deleted" });
  } catch (error) {
    console.error("Error deleting onboarding record:", error);
    return NextResponse.json(
      { error: "Failed to delete onboarding record" },
      { status: 500 }
    );
  }
}
