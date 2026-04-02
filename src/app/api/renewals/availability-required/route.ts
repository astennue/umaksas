import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/renewals/availability-required - Adviser/Super Admin sets availability requirement
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["SUPER_ADMIN", "ADVISER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, required } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    if (typeof required !== "boolean") {
      return NextResponse.json(
        { error: "Required field must be a boolean" },
        { status: 400 }
      );
    }

    // Check if user is a student assistant
    const saUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!saUser || saUser.role !== "STUDENT_ASSISTANT") {
      return NextResponse.json(
        { error: "User is not a Student Assistant" },
        { status: 400 }
      );
    }

    // Find or create renewal for this user and set availabilityRequired
    let renewal = await db.renewal.findUnique({
      where: { userId },
    });

    if (renewal) {
      renewal = await db.renewal.update({
        where: { userId },
        data: { availabilityRequired: required },
      });
    } else {
      renewal = await db.renewal.create({
        data: {
          userId,
          availabilityRequired: required,
        },
      });
    }

    return NextResponse.json({
      renewal,
      message: required
        ? "Availability submission is now required for this SA"
        : "Availability submission is no longer required for this SA",
    });
  } catch (error) {
    console.error("Error updating availability requirement:", error);
    return NextResponse.json(
      { error: "Failed to update availability requirement" },
      { status: 500 }
    );
  }
}
