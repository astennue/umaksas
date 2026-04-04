import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/events - List events with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const officeId = searchParams.get("officeId") || "";
    const startDate = searchParams.get("startDate") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id?: string }).id;

    // Build where clause
    const where: Prisma.EventWhereInput = {};

    if (status && status !== "all") {
      where.status = status as any;
    }

    if (officeId) {
      where.officeId = officeId;
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    // For STUDENT_ASSISTANT, only show their assigned events
    if (userRole === "STUDENT_ASSISTANT" && userId) {
      where.assignments = {
        some: { userId },
      };
    }

    const [events, total] = await Promise.all([
      db.event.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          office: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { assignments: true },
          },
        },
      }),
      db.event.count({ where }),
    ]);

    // For each event, get confirmed count
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const confirmedCount = await db.eventAssignment.count({
          where: { eventId: event.id, status: { in: ["CONFIRMED", "ASSIGNED"] } },
        });
        return {
          ...event,
          confirmedCount,
        };
      })
    );

    return NextResponse.json({
      events: eventsWithCounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST /api/events - Create event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, location, startDate, endDate, requiredSACount, officeId } = body;

    if (!name || !startDate) {
      return NextResponse.json(
        { error: "Name and start date are required" },
        { status: 400 }
      );
    }

    const event = await db.event.create({
      data: {
        name,
        description: description || null,
        location: location || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        requiredSACount: requiredSACount ? parseInt(requiredSACount, 10) : null,
        officeId: officeId || null,
      },
      include: {
        office: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
