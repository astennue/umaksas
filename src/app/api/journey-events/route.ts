import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/journey-events - Returns all active journey events ordered by orderIndex (public)
export async function GET() {
  try {
    const events = await db.journeyEvent.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching journey events:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey events" },
      { status: 500 }
    );
  }
}

// PUT /api/journey-events - Replace all journey events (SUPER_ADMIN, ADVISER, SAS PRESIDENT only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const userRole = (session.user as { role?: string }).role;

    // Check if user is allowed: SUPER_ADMIN, ADVISER, or SAS President (OFFICER with PRESIDENT position)
    if (userRole === "SUPER_ADMIN" || userRole === "ADVISER") {
      // Allowed
    } else if (userRole === "OFFICER" && userId) {
      // Check if this officer is the SAS President
      const officerProfile = await db.officerProfile.findFirst({
        where: { userId, position: "PRESIDENT" },
      });
      if (!officerProfile) {
        return NextResponse.json(
          {
            error:
              "Unauthorized. Only SUPER_ADMIN, ADVISER, or SAS President can manage journey events.",
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Only SUPER_ADMIN, ADVISER, or SAS President can manage journey events.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { events } = body as {
      events: {
        id?: string;
        year: string;
        title: string;
        description?: string;
        orderIndex: number;
        isActive?: boolean;
      }[];
    };

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Events must be an array" },
        { status: 400 }
      );
    }

    // Delete all existing events
    await db.journeyEvent.deleteMany();

    // Create new events with the provided data
    const createdEvents = await db.journeyEvent.createMany({
      data: events.map((event) => ({
        year: event.year,
        title: event.title,
        description: event.description || null,
        orderIndex: event.orderIndex,
        isActive: event.isActive ?? true,
      })),
    });

    // Fetch all newly created events to return
    const allEvents = await db.journeyEvent.findMany({
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      message: `Successfully updated ${createdEvents.count} journey events`,
      events: allEvents,
    });
  } catch (error) {
    console.error("Error updating journey events:", error);
    return NextResponse.json(
      { error: "Failed to update journey events" },
      { status: 500 }
    );
  }
}
