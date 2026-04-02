import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/applications/track/[ref] - Track application by reference
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;

    if (!ref) {
      return NextResponse.json(
        { error: "Reference parameter is required" },
        { status: 400 }
      );
    }

    // Look up by application ID or email
    const application = await db.application.findFirst({
      where: {
        OR: [
          { id: ref },
          { applicantEmail: ref },
        ],
      },
      select: {
        id: true,
        applicantEmail: true,
        firstName: true,
        lastName: true,
        status: true,
        currentStep: true,
        submittedAt: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        interviewStatus: true,
        interviewDate: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "No application found with this reference" },
        { status: 404 }
      );
    }

    // Build status timeline
    const timeline = buildTimeline(application);

    return NextResponse.json({
      ...application,
      timeline,
    });
  } catch (error: any) {
    console.error("Error tracking application:", error);
    return NextResponse.json(
      { error: "Failed to track application" },
      { status: 500 }
    );
  }
}

function buildTimeline(app: any) {
  const timeline = [
    {
      status: "SUBMITTED",
      label: "Application Submitted",
      description: "Your application has been received and is awaiting review.",
      completed: ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_SCHEDULED", "INTERVIEWED", "APPROVED", "REJECTED"].includes(app.status),
      date: app.submittedAt,
    },
    {
      status: "UNDER_REVIEW",
      label: "Under Review",
      description: "The SA Adviser is reviewing your application.",
      completed: ["UNDER_REVIEW", "INTERVIEW_SCHEDULED", "INTERVIEWED", "APPROVED", "REJECTED"].includes(app.status),
      date: app.status === "UNDER_REVIEW" || ["INTERVIEW_SCHEDULED", "INTERVIEWED", "APPROVED", "REJECTED"].includes(app.status) ? app.updatedAt : null,
    },
    {
      status: "INTERVIEW_SCHEDULED",
      label: "Interview Scheduled",
      description: "An interview has been scheduled for you.",
      completed: ["INTERVIEW_SCHEDULED", "INTERVIEWED", "APPROVED"].includes(app.status),
      date: app.interviewDate,
    },
    {
      status: "INTERVIEWED",
      label: "Interview Completed",
      description: "Your interview has been completed.",
      completed: ["INTERVIEWED", "APPROVED"].includes(app.status),
      date: app.interviewStatus === "COMPLETED" ? app.updatedAt : null,
    },
    {
      status: "APPROVED",
      label: "Approved",
      description: "Congratulations! Your application has been approved.",
      completed: app.status === "APPROVED",
      date: app.status === "APPROVED" ? app.updatedAt : null,
    },
  ];

  return timeline;
}
