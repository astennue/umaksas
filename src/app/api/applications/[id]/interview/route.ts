import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/applications/[id]/interview - Create interview slot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { id } = await params;
    const body = await request.json();
    const { scheduledAt, duration, meetingLink, notes } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required" },
        { status: 400 }
      );
    }

    // Check application exists
    const application = await db.application.findUnique({
      where: { id },
      include: { interviewSlots: true },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Create interview slot
    const interviewSlot = await db.interviewSlot.create({
      data: {
        scheduledAt: new Date(scheduledAt),
        duration: duration || 30,
        meetingLink: meetingLink || null,
        notes: notes || null,
        interviewerId: user.id,
        applicationId: id,
        intervieweeId: application.userId || null,
        status: "SCHEDULED",
      },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        interviewee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        application: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            applicantEmail: true,
          },
        },
      },
    });

    // Update application interview status
    await db.application.update({
      where: { id },
      data: {
        interviewStatus: "SCHEDULED",
        interviewDate: new Date(scheduledAt),
        status: "INTERVIEW_SCHEDULED",
      },
    });

    // Create notification for applicant
    if (application.userId) {
      const scheduledDate = new Date(scheduledAt);
      const formattedDate = scheduledDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      await db.notification.create({
        data: {
          userId: application.userId,
          type: "INTERVIEW_SCHEDULED",
          title: "Interview Scheduled",
          message: `Your interview for the Student Assistant program has been scheduled for ${formattedDate}. Please check your interview details.`,
          link: "/dashboard/interviews",
        },
      });
    }

    return NextResponse.json(interviewSlot, { status: 201 });
  } catch (error) {
    console.error("Error creating interview slot:", error);
    return NextResponse.json(
      { error: "Failed to create interview slot" },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id]/interview - Get interview slots for application
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

    const interviewSlots = await db.interviewSlot.findMany({
      where: { applicationId: id },
      orderBy: { scheduledAt: "desc" },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        interviewee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(interviewSlots);
  } catch (error) {
    console.error("Error fetching interview slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview slots" },
      { status: 500 }
    );
  }
}
