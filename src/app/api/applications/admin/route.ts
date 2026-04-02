import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          applicantEmail: true,
          userId: true,
          firstName: true,
          lastName: true,
          college: true,
          program: true,
          status: true,
          interviewStatus: true,
          interviewScore: true,
          interviewDate: true,
          totalScore: true,
          rank: true,
          currentStep: true,
          submittedAt: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          // Upload fields
          photoUrl: true,
          resumeUrl: true,
          gradeReportUrl: true,
          registrationUrl: true,
          // Additional details
          studentNumber: true,
          yearLevel: true,
          gwa: true,
          essayWhyApply: true,
        },
      }),
      db.application.count({ where }),
    ]);

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

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be APPROVED or REJECTED" },
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

    // Prevent reviewing already finalized applications
    if (["APPROVED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
      return NextResponse.json(
        { error: `Application is already ${application.status}` },
        { status: 400 }
      );
    }

    // Update the application
    const updated = await db.application.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    // Create notification for the applicant
    try {
      const applicant = application.userId
        ? await db.user.findUnique({ where: { id: application.userId } })
        : null;

      if (applicant) {
        await db.notification.create({
          data: {
            userId: applicant.id,
            type: status === "APPROVED" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
            title:
              status === "APPROVED"
                ? "Application Approved"
                : "Application Update",
            message:
              status === "APPROVED"
                ? `Congratulations! Your student assistant application has been approved. You will be notified about the next steps.`
                : `Your student assistant application has been reviewed. Please check your application status for more details.${
                    reviewNotes ? ` Reason: ${reviewNotes}` : ""
                  }`,
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

      if (adviser && adviser.id !== session.user.id) {
        await db.notification.create({
          data: {
            userId: adviser.id,
            type: status === "APPROVED" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
            title: `Application ${status}`,
            message: `An application from ${application.firstName || ""} ${application.lastName || ""} (${application.applicantEmail}) has been ${status.toLowerCase()} by ${session.user.name || userRole}.${
              reviewNotes ? ` Notes: ${reviewNotes}` : ""
            }`,
            link: `/dashboard/applications`,
          },
        });
      }
    } catch (notifError) {
      console.error("Error creating adviser notification:", notifError);
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
