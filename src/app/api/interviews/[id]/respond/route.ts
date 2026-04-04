import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { InterviewStatus, InterviewAppStatus, NotificationType } from "@prisma/client";

// PUT /api/interviews/[id]/respond - Applicant responds to interview
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
    const body = await request.json();
    const { action, reason } = body;

    if (!["accept", "decline", "reschedule"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be: accept, decline, or reschedule" },
        { status: 400 }
      );
    }

    // Check interview slot exists
    const interviewSlot = await db.interviewSlot.findUnique({
      where: { id },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        application: {
          select: { id: true, applicantEmail: true, userId: true },
        },
      },
    });

    if (!interviewSlot) {
      return NextResponse.json(
        { error: "Interview slot not found" },
        { status: 404 }
      );
    }

    // Verify ownership - applicant must be the interviewee
    if (!interviewSlot.application) {
      return NextResponse.json(
        { error: "Interview slot has no associated application" },
        { status: 400 }
      );
    }

    if (interviewSlot.intervieweeId !== user.id && interviewSlot.application.userId !== user.id) {
      return NextResponse.json(
        { error: "You are not authorized to respond to this interview" },
        { status: 403 }
      );
    }

    // Update interview status based on action
    let newStatus: InterviewStatus;
    let appInterviewStatus: InterviewAppStatus;

    switch (action) {
      case "accept":
        newStatus = InterviewStatus.ACCEPTED;
        appInterviewStatus = InterviewAppStatus.ACCEPTED;
        break;
      case "decline":
        newStatus = InterviewStatus.DECLINED;
        appInterviewStatus = InterviewAppStatus.PENDING;
        break;
      case "reschedule":
        newStatus = InterviewStatus.RESCHEDULE_REQUESTED;
        appInterviewStatus = InterviewAppStatus.RESCHEDULE_REQUESTED;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    const updatedSlot = await db.interviewSlot.update({
      where: { id },
      data: {
        status: newStatus,
        rescheduleReason: action === "reschedule" ? reason : null,
      },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        interviewee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Update application interview status
    await db.application.update({
      where: { id: interviewSlot.applicationId },
      data: {
        interviewStatus: appInterviewStatus,
      },
    });

    // Create notification for interviewer
    const applicantName = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : interviewSlot.application.applicantEmail;

    let notifType: NotificationType = NotificationType.SYSTEM;
    let notifTitle: string = "";
    let notifMessage: string = "";

    switch (action) {
      case "accept":
        notifType = NotificationType.INTERVIEW_SCHEDULED;
        notifTitle = "Interview Accepted";
        notifMessage = `${applicantName} has accepted the interview scheduled for ${interviewSlot.scheduledAt.toLocaleDateString()}.`;
        break;
      case "decline":
        notifType = NotificationType.SYSTEM;
        notifTitle = "Interview Declined";
        notifMessage = `${applicantName} has declined the interview scheduled for ${interviewSlot.scheduledAt.toLocaleDateString()}.`;
        break;
      case "reschedule":
        notifType = NotificationType.INTERVIEW_RESCHEDULE_REQUESTED;
        notifTitle = "Reschedule Requested";
        notifMessage = `${applicantName} has requested to reschedule the interview. Reason: ${reason || "No reason provided"}.`;
        break;
    }

    await db.notification.create({
      data: {
        userId: interviewSlot.interviewerId,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        link: "/dashboard/interviews",
      },
    });

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error("Error responding to interview:", error);
    return NextResponse.json(
      { error: "Failed to respond to interview" },
      { status: 500 }
    );
  }
}
