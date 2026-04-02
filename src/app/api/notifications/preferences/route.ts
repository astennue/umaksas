import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications/preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string };

    let preferences = await db.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      preferences = await db.notificationPreference.create({
        data: { userId: user.id },
      });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string };
    const body = await request.json();

    const updatableFields = [
      "applicationSubmitted",
      "applicationApproved",
      "applicationRejected",
      "interviewScheduled",
      "interviewReminder",
      "evaluationDue",
      "evaluationSubmitted",
      "paymentDue",
      "paymentVerified",
      "eventAssigned",
      "eventReminder",
      "scheduleApproved",
      "attendanceCorrected",
      "accountCreated",
      "system",
    ];

    const updateData: Record<string, boolean> = {};
    for (const field of updatableFields) {
      if (field in body && typeof body[field] === "boolean") {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const preferences = await db.notificationPreference.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
