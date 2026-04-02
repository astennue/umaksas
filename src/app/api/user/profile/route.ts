import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/user/profile — Update profile details
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const { firstName, middleName, lastName, suffix, phone, photoUrl } = body;

    // Update user record
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName: firstName || null }),
        ...(middleName !== undefined && { middleName: middleName || null }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(suffix !== undefined && { suffix: suffix || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl || null }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        phone: true,
        photoUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: unknown) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// GET /api/user/profile — Fetch current user's full profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        phone: true,
        photoUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        profile: {
          select: {
            id: true,
            studentNumber: true,
            college: true,
            program: true,
            yearLevel: true,
            academicYear: true,
            semester: true,
            employeeId: true,
            dateHired: true,
            status: true,
            totalHoursWorked: true,
            hoursThisSemester: true,
            isOnDuty: true,
            lastClockIn: true,
            office: {
              select: {
                id: true,
                name: true,
                code: true,
                email: true,
                location: true,
              },
            },
          },
        },
        officerProfile: {
          select: {
            id: true,
            position: true,
            orderIndex: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
