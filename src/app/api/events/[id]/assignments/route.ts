import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/events/[id]/assignments - List assignments for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const event = await db.event.findUnique({
      where: { id },
      include: {
        office: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const assignments = await db.eventAssignment.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            profile: {
              select: {
                college: true,
                program: true,
                status: true,
                office: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
        office: event.office,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      assignments,
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/assignments - Assign SAs to event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userIds, role } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    const event = await db.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const userId = (session.user as { id?: string }).id;

    // Create assignments, skip duplicates
    const results = await Promise.all(
      userIds.map(async (uid: string) => {
        try {
          const assignment = await db.eventAssignment.upsert({
            where: {
              eventId_userId: { eventId: id, userId: uid },
            },
            create: {
              eventId: id,
              userId: uid,
              role: role || "Student Assistant",
              assignedBy: userId,
              status: "ASSIGNED",
            },
            update: {
              status: "ASSIGNED",
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profile: {
                    select: { college: true, program: true },
                  },
                },
              },
            },
          });
          return { success: true, assignment };
        } catch {
          return { success: false, userId: uid, error: "Failed to assign" };
        }
      })
    );

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // Create notifications for assigned SAs
    await Promise.all(
      succeeded.map((r) => {
        if (r.success && "assignment" in r) {
          return db.notification.create({
            data: {
              userId: r.assignment!.userId,
              type: "EVENT_ASSIGNED",
              title: "New Event Assignment",
              message: `You have been assigned to the event "${event.name}". Please confirm or decline.`,
              link: `/dashboard/events`,
            },
          }).catch(() => {});
        }
        return null;
      })
    );

    return NextResponse.json({
      assigned: succeeded.length,
      failed: failed.length,
      results: succeeded.map((r) => (r.success && "assignment" in r ? r.assignment! : null)).filter(Boolean),
    });
  } catch (error) {
    console.error("Error assigning SAs:", error);
    return NextResponse.json(
      { error: "Failed to assign student assistants" },
      { status: 500 }
    );
  }
}
