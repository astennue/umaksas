import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/interviews/[id]/cancel - Cancel an interview
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; firstName?: string; lastName?: string };
    const { id } = await params;

    // Check interview slot exists and include relations
    const interviewSlot = await db.interviewSlot.findUnique({
      where: { id },
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
            applicantEmail: true,
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!interviewSlot) {
      return NextResponse.json(
        { error: "Interview slot not found" },
        { status: 404 }
      );
    }

    // Check interview is in a cancellable state
    const cancellableStatuses = ["SCHEDULED", "ACCEPTED", "RESCHEDULE_REQUESTED"];
    if (!cancellableStatuses.includes(interviewSlot.status)) {
      return NextResponse.json(
        { error: `Cannot cancel an interview with status: ${interviewSlot.status}` },
        { status: 400 }
      );
    }

    // Authorization:
    // - SUPER_ADMIN, ADVISER, OFFICER can cancel any interview
    // - The applicant (interviewee or application owner) can cancel their own
    const adminRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER"];
    const isApplicant =
      interviewSlot.intervieweeId === user.id ||
      interviewSlot.application?.userId === user.id;

    if (!adminRoles.includes(user.role) && !isApplicant) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this interview" },
        { status: 403 }
      );
    }

    // Update interview slot status to CANCELLED
    const updatedSlot = await db.interviewSlot.update({
      where: { id },
      data: {
        status: "CANCELLED",
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
            userId: true,
          },
        },
      },
    });

    // Reset application's interviewStatus to PENDING
    await db.application.update({
      where: { id: interviewSlot.applicationId },
      data: {
        interviewStatus: "PENDING",
      },
    });

    // Determine who cancelled and notify the other party
    const cancelledByApplicant = isApplicant;
    const scheduledDate = interviewSlot.scheduledAt.toLocaleDateString();

    if (cancelledByApplicant) {
      // Applicant cancelled → notify the interviewer
      const applicantName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : interviewSlot.application.applicantEmail;

      await db.notification.create({
        data: {
          userId: interviewSlot.interviewerId,
          type: "SYSTEM",
          title: "Interview Cancelled by Applicant",
          message: `${applicantName} has cancelled their interview scheduled for ${scheduledDate}. The application has been reset to pending status.`,
          link: "/dashboard/interviews",
        },
      });
    } else {
      // Admin/officer cancelled → notify the applicant
      const applicantId = interviewSlot.intervieweeId || interviewSlot.application?.userId;
      if (applicantId) {
        const applicantName = interviewSlot.application.firstName
          ? `${interviewSlot.application.firstName} ${interviewSlot.application.lastName || ""}`.trim()
          : interviewSlot.application.applicantEmail;

        await db.notification.create({
          data: {
            userId: applicantId,
            type: "SYSTEM",
            title: "Interview Cancelled",
            message: `Your interview scheduled for ${scheduledDate} has been cancelled by the administration. Your application has been reset to pending status.`,
            link: "/dashboard/applications",
          },
        });
      }
    }

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error("Error cancelling interview:", error);
    return NextResponse.json(
      { error: "Failed to cancel interview" },
      { status: 500 }
    );
  }
}
