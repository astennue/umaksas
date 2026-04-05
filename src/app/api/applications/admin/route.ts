import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendApplicationStatusEmail } from "@/lib/email";

// GET /api/applications/admin - List all applications for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const adminRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER", "HRMO"];
    if (!userRole || !adminRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where["status"] = status;
    }

    if (search) {
      where["OR"] = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { applicantEmail: { contains: search } },
        { college: { contains: search } },
        { studentNumber: { contains: search } },
      ];
    }

    // Fetch applications — use findMany without explicit select so Prisma returns
    // all scalar fields automatically. This avoids errors if the DB schema is
    // slightly out of sync (e.g. reviewNotes column missing on an old deploy).
    let applications;
    let total;
    try {
      [applications, total] = await Promise.all([
        db.application.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.application.count({ where }),
      ]);
    } catch (dbError: unknown) {
      // If the error mentions a missing column (e.g. reviewNotes), log helpful info
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      console.error("Database query failed — schema may be out of sync:", msg);
      // Attempt a plain select with only core fields as fallback
      try {
        [applications, total] = await Promise.all([
          db.application.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            select: {
              id: true,
              applicantEmail: true,
              userId: true,
              status: true,
              currentStep: true,
              submittedAt: true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              dateOfBirth: true,
              placeOfBirth: true,
              gender: true,
              civilStatus: true,
              religion: true,
              citizenship: true,
              email: true,
              phone: true,
              alternatePhone: true,
              residenceAddress: true,
              residenceCity: true,
              residenceZip: true,
              fatherName: true,
              fatherOccupation: true,
              fatherContact: true,
              motherName: true,
              motherMaidenName: true,
              motherOccupation: true,
              motherContact: true,
              guardianName: true,
              guardianRelation: true,
              guardianContact: true,
              siblingsCount: true,
              elementarySchool: true,
              elementaryYear: true,
              highSchool: true,
              highSchoolYear: true,
              seniorHigh: true,
              seniorHighYear: true,
              seniorHighTrack: true,
              studentNumber: true,
              college: true,
              program: true,
              yearLevel: true,
              section: true,
              gwa: true,
              employmentJson: true,
              availabilityJson: true,
              trainingsJson: true,
              referencesJson: true,
              essayWhyApply: true,
              essayGoals: true,
              essaySkills: true,
              essayChallenges: true,
              photoUrl: true,
              resumeUrl: true,
              gradeReportUrl: true,
              registrationUrl: true,
              residenceImageUrl: true,
              interviewStatus: true,
              interviewScore: true,
              interviewDate: true,
              interviewNotes: true,
              totalScore: true,
              rank: true,
            },
          }),
          db.application.count({ where }),
        ]);
      } catch (fallbackError: unknown) {
        console.error("Fallback query also failed:", fallbackError);
        throw dbError;
      }
    }

    return NextResponse.json({
      applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

// PUT /api/applications/admin - Approve or reject an application
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const reviewRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER"];
    if (!userRole || !reviewRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN, ADVISER, or OFFICER can review applications" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, reviewNotes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Application ID and status are required" },
        { status: 400 }
      );
    }

    // Allow APPROVED, REJECTED, and revert statuses (UNDER_REVIEW, SUBMITTED, INTERVIEW_SCHEDULED)
    const allowedStatuses = ["APPROVED", "REJECTED", "UNDER_REVIEW", "SUBMITTED", "INTERVIEW_SCHEDULED"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Check if application exists
    const application = await db.application.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Allow reverting from APPROVED/REJECTED to other statuses (with reviewNotes)
    // But prevent WITHDRAWN from being changed
    if (application.status === "WITHDRAWN") {
      return NextResponse.json(
        { error: "Application has been withdrawn and cannot be modified" },
        { status: 400 }
      );
    }

    // If reverting from finalized status, require reviewNotes
    const isReverting = ["APPROVED", "REJECTED"].includes(application.status) && 
                        ["UNDER_REVIEW", "SUBMITTED", "INTERVIEW_SCHEDULED"].includes(status);
    if (isReverting && !reviewNotes) {
      return NextResponse.json(
        { error: "Review notes are required when reverting application status" },
        { status: 400 }
      );
    }

    // Update the application
    const updated = await db.application.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        ...(reviewNotes ? { reviewNotes } : {}),
      },
    });

    // Determine notification type based on action
    let notifType: string;
    let notifTitle: string;
    let notifMessage: string;

    if (isReverting) {
      notifType = "SYSTEM";
      notifTitle = "Application Status Updated";
      notifMessage = `Your application status has been updated to ${status.replace(/_/g, " ")}.${reviewNotes ? ` Note: ${reviewNotes}` : ""}`;
    } else if (status === "APPROVED") {
      notifType = "APPLICATION_APPROVED";
      notifTitle = "Application Approved";
      notifMessage = "Congratulations! Your student assistant application has been approved. You will be notified about the next steps.";
    } else {
      notifType = "APPLICATION_REJECTED";
      notifTitle = "Application Update";
      notifMessage = `Your student assistant application has been reviewed.${reviewNotes ? ` Reason: ${reviewNotes}` : ""}`;
    }

    // Create notification for the applicant
    try {
      const applicant = application.userId
        ? await db.user.findUnique({ where: { id: application.userId } })
        : null;

      if (applicant) {
        await db.notification.create({
          data: {
            userId: applicant.id,
            type: notifType as "APPLICATION_APPROVED" | "APPLICATION_REJECTED" | "SYSTEM",
            title: notifTitle,
            message: notifMessage,
            link: "/dashboard/applications",
          },
        });
      }
    } catch (notifError) {
      console.error("Error creating applicant notification:", notifError);
    }

    // Create notification for the adviser
    try {
      const adviser = await db.user.findFirst({
        where: { role: "ADVISER", isActive: true },
      });

      if (adviser && adviser.id !== (session.user as { id?: string }).id) {
        await db.notification.create({
          data: {
            userId: adviser.id,
            type: notifType as "APPLICATION_APPROVED" | "APPLICATION_REJECTED" | "SYSTEM",
            title: notifTitle,
            message: `An application from ${application.firstName || ""} ${application.lastName || ""} (${application.applicantEmail}) has been ${isReverting ? "updated to " + status : status.toLowerCase()} by ${session.user.name || userRole}.${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`,
            link: `/dashboard/applications`,
          },
        });
      }
    } catch (notifError) {
      console.error("Error creating adviser notification:", notifError);
    }

    // Send status update email to applicant (async, don't fail the review)
    try {
      const applicantName = `${application.firstName || ""} ${application.lastName || ""}`.trim() || application.applicantEmail;
      const applicantEmail = application.email || application.applicantEmail;
      if (applicantEmail) {
        await sendApplicationStatusEmail(
          applicantEmail,
          applicantName,
          application.id,
          status as "APPROVED" | "REJECTED",
          reviewNotes || undefined
        );
      }
    } catch (emailError) {
      console.error("Warning: Could not send status email:", emailError);
    }

    return NextResponse.json({
      application: updated,
      message: `Application ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Error reviewing application:", error);
    return NextResponse.json(
      { error: "Failed to review application" },
      { status: 500 }
    );
  }
}
