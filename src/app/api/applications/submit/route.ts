import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendApplicationEmail } from "@/lib/email";

// POST /api/applications/submit - Submit final application
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Session is optional — allow submitting applications without login

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

    // If session exists, verify ownership: only the applicant or an officer can submit
    if (session?.user) {
      const userId = (session.user as any).id;
      if (application.userId && application.userId !== userId) {
        // Allow officers/advisers/admins to submit on behalf
        const userRole = (session.user as any).role;
        const allowedRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER"];
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
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
      if (!Array.isArray(refs) || refs.length < 4) {
        return NextResponse.json(
          { error: "At least 4 character references are required" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "At least 4 character references are required" },
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

    // Send confirmation email with full PDF (async, don't fail the submission)
    try {
      const applicantName = `${application.firstName || ""} ${application.lastName || ""}`.trim() || application.applicantEmail;
      const applicantEmail = application.email || application.applicantEmail;

      // Generate full PDF by calling the PDF endpoint internally
      let pdfBuffer: Buffer | undefined;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
        const pdfRes = await fetch(`${baseUrl}/api/applications/${applicationId}/pdf`, {
          headers: { 
            "x-internal-call": "true",
          },
        });
        if (pdfRes.ok) {
          const arrayBuffer = await pdfRes.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuffer);
        } else {
          console.error("Warning: PDF endpoint returned", pdfRes.status);
        }
      } catch (pdfErr) {
        console.error("Warning: Could not generate PDF for email attachment:", pdfErr);
      }

      await sendApplicationEmail(applicantEmail, applicantName, updated.id, pdfBuffer);
    } catch (emailError) {
      console.error("Warning: Could not send application email:", emailError);
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
