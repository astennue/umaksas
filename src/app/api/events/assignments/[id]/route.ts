import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/events/assignments/[id] - Update assignment (confirm/decline/mark attendance)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, hoursRendered } = body;

    const existing = await db.eventAssignment.findUnique({
      where: { id },
      include: {
        event: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id?: string }).id;

    // SA confirms assignment
    if (action === "confirm") {
      if (existing.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "ASSIGNED") {
        return NextResponse.json(
          { error: "Only ASSIGNED assignments can be confirmed" },
          { status: 400 }
        );
      }

      const assignment = await db.eventAssignment.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      return NextResponse.json({ assignment });
    }

    // SA declines assignment
    if (action === "decline") {
      if (existing.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "ASSIGNED") {
        return NextResponse.json(
          { error: "Only ASSIGNED assignments can be declined" },
          { status: 400 }
        );
      }

      const assignment = await db.eventAssignment.update({
        where: { id },
        data: {
          status: "DECLINED",
          confirmedAt: new Date(),
        },
      });

      return NextResponse.json({ assignment });
    }

    // Admin marks attendance
    if (action === "mark_present") {
      if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const assignment = await db.eventAssignment.update({
        where: { id },
        data: {
          attended: true,
          hoursRendered: hoursRendered ? parseFloat(hoursRendered) : null,
        },
      });

      return NextResponse.json({ assignment });
    }

    // Admin marks absent
    if (action === "mark_absent") {
      if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const assignment = await db.eventAssignment.update({
        where: { id },
        data: {
          attended: false,
          status: "ABSENT",
        },
      });

      return NextResponse.json({ assignment });
    }

    // Update hours rendered
    if (action === "update_hours") {
      if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const assignment = await db.eventAssignment.update({
        where: { id },
        data: {
          hoursRendered: hoursRendered !== undefined ? parseFloat(hoursRendered) : null,
        },
      });

      return NextResponse.json({ assignment });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: confirm, decline, mark_present, mark_absent, update_hours" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}
