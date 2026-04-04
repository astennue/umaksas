import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/applications/submit - Submit final application
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Get the application
    const application = await db.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Application has already been submitted" },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      "firstName", "lastName", "dateOfBirth", "placeOfBirth",
      "gender", "civilStatus", "citizenship", "email", "phone",
      "elementarySchool", "highSchool", "seniorHigh",
      "studentNumber", "college", "program", "yearLevel", "gwa",
      "residenceAddress", "residenceCity",
      "essayWhyApply", "essayGoals", "essaySkills", "essayChallenges",
    ];

    for (const field of requiredFields) {
      const value = (application as any)[field];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check references
    if (application.referencesJson) {
      const refs = JSON.parse(application.referencesJson);
      if (!Array.isArray(refs) || refs.length < 3) {
        return NextResponse.json(
          { error: "At least 3 character references are required" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "At least 3 character references are required" },
        { status: 400 }
      );
    }

    // Update application status
    const updated = await db.application.update({
      where: { id: applicationId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        currentStep: 11,
      },
    });

    // Create notification for the adviser
    try {
      const adviser = await db.user.findFirst({
        where: { role: "ADVISER", isActive: true },
      });

      if (adviser) {
        await db.notification.create({
          data: {
            userId: adviser.id,
            type: "APPLICATION_SUBMITTED",
            title: "New Application Submitted",
            message: `A new application has been submitted by ${application.firstName} ${application.lastName} (${application.applicantEmail}).`,
            link: `/dashboard/applications/${applicationId}`,
          },
        });
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
      // Don't fail the submission if notification fails
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: "Application submitted successfully",
    });
  } catch (error: any) {
    console.error("Error submitting application:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
