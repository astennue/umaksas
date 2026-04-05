import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendApplicationEmail } from "@/lib/email";

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

    // Send confirmation email with PDF (async, don't fail the submission)
    try {
      const applicantName = `${application.firstName || ""} ${application.lastName || ""}`.trim() || application.applicantEmail;
      const applicantEmail = application.email || application.applicantEmail;

      // Generate PDF buffer for email attachment
      let pdfBuffer: Buffer | undefined;
      try {
        const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pageWidth = 595.28;
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;
        let y = 780;

        const page = pdfDoc.addPage([pageWidth, 841.89]);
        page.drawText("UNIVERSITY OF MAKATI", { x: margin, y, size: 16, font: fontBold, color: rgb(0, 0.15, 0.4) });
        y -= 18;
        page.drawText("STUDENT ASSISTANTSHIP SOCIETY", { x: margin, y, size: 12, font: fontBold, color: rgb(0, 0.15, 0.4) });
        y -= 16;
        page.drawText("APPLICATION FORM", { x: margin, y, size: 10, font: fontBold });
        y -= 24;
        page.drawText(`Name: ${applicantName}`, { x: margin, y, size: 10, font });
        y -= 14;
        page.drawText(`Reference: ${updated.id}`, { x: margin, y, size: 10, font });
        y -= 14;
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: margin, y, size: 10, font });

        const pdfBytes = await pdfDoc.save();
        pdfBuffer = Buffer.from(pdfBytes);
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
