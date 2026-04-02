import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/interviews/[id]/complete - Mark interview as completed with scores
export async function PUT(
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

    const allowedRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER", "HRMO"];
    if (!user.role || !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { score, notes } = body;

    if (score === undefined || score === null) {
      return NextResponse.json(
        { error: "Score is required" },
        { status: 400 }
      );
    }

    if (typeof score !== "number" || score < 0 || score > 100) {
      return NextResponse.json(
        { error: "Score must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Check interview slot exists
    const interviewSlot = await db.interviewSlot.findUnique({
      where: { id },
      include: {
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

    // Update interview slot
    const updatedSlot = await db.interviewSlot.update({
      where: { id },
      data: {
        status: "COMPLETED",
        score,
        notes: notes || null,
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

    // Update application status
    await db.application.update({
      where: { id: interviewSlot.applicationId },
      data: {
        interviewStatus: "COMPLETED",
        status: "INTERVIEWED",
        interviewScore: score,
        interviewNotes: notes || null,
        reviewedAt: new Date(),
      },
    });

    // Notify applicant about interview completion
    if (interviewSlot.application.userId) {
      await db.notification.create({
        data: {
          userId: interviewSlot.application.userId,
          type: "SYSTEM",
          title: "Interview Completed",
          message: `Your interview for the Student Assistant program has been completed. Your interview score: ${score}/100.`,
          link: "/dashboard/applications",
        },
      });
    }

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error("Error completing interview:", error);
    return NextResponse.json(
      { error: "Failed to complete interview" },
      { status: 500 }
    );
  }
}
