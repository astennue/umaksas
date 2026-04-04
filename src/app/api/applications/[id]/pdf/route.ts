import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const allowedRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER", "HRMO"];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const app = await db.application.findUnique({
      where: { id },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;
    const fontSizeSmall = 8;
    const fontSizeTitle = 16;
    const fontSizeSubtitle = 12;
    const pageWidth = 595.28; // A4 width
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let y = 780; // Start near top
    const pageHeight = 841.89;

    const addPageIfNeeded = (neededHeight: number) => {
      if (y - neededHeight < margin) {
        pdfDoc.addPage();
        y = pageHeight - margin;
        return true;
      }
      return false;
    };

    const drawText = (text: string, x: number, yPos: number, f: typeof font = font, s: number = fontSize, color: [number, number, number] = rgb(0, 0, 0)) => {
      pdfDoc.drawText(text, { x, y: yPos, size: s, font: f, color });
    };

    const drawLine = (x1: number, yPos: number, width: number) => {
      pdfDoc.drawLine({ start: { x: x1, y: yPos }, end: { x: x1 + width, y: yPos }, thickness: 1, color: rgb(0.4, 0.4, 0.4) });
    };

    const checkPageBreak = (needed: number) => {
      if (y - needed < margin + 20) {
        pdfDoc.addPage();
        y = pageHeight - margin;
      }
    };

    // ====== HEADER ======
    drawText("UNIVERSITY OF MAKATI", margin, y, fontBold, fontSizeTitle, rgb(0, 0.15, 0.4));
    y -= 18;
    drawText("UMAK STUDENT ASSISTANTSHIP SOCIETY", margin, y, fontBold, fontSizeSubtitle, rgb(0, 0.15, 0.4));
    y -= 16;
    drawText("APPLICATION FORM", margin, y, fontBold, fontSize, rgb(0.2, 0.2, 0.2));
    y -= 8;
    drawLine(margin, y, contentWidth);
    y -= 16;

    // ====== SECTION HELPER ======
    const drawSectionTitle = (title: string) => {
      checkPageBreak(30);
      y -= 6;
      drawText(title.toUpperCase(), margin, y, fontBold, fontSize, rgb(0, 0.15, 0.4));
      y -= 2;
      drawLine(margin, y, contentWidth);
      y -= 14;
    };

    const drawField = (label: string, value: string | null | undefined, colWidth?: number) => {
      const cw = colWidth || contentWidth;
      checkPageBreak(16);
      drawText(label + ":", margin, y, font, fontSizeSmall, rgb(0.3, 0.3, 0.3));
      const labelW = font.widthOfTextAtSize(label + ": ", fontSizeSmall);
      drawText(value || "N/A", margin + labelW + 4, y, font, fontSizeSmall);
      y -= 13;
    };

    const drawFieldTwoCol = (label1: string, value1: string | null, label2: string, value2: string | null) => {
      const halfWidth = contentWidth / 2;
      checkPageBreak(16);
      drawText(label1 + ":", margin, y, font, fontSizeSmall, rgb(0.3, 0.3, 0.3));
      const label1W = font.widthOfTextAtSize(label1 + ": ", fontSizeSmall);
      drawText(value1 || "N/A", margin + label1W + 4, y, font, fontSizeSmall);

      drawText(label2 + ":", margin + halfWidth, y, font, fontSizeSmall, rgb(0.3, 0.3, 0.3));
      const label2W = font.widthOfTextAtSize(label2 + ": ", fontSizeSmall);
      drawText(value2 || "N/A", margin + halfWidth + label2W + 4, y, font, fontSizeSmall);
      y -= 13;
    };

    // ====== PERSONAL INFORMATION ======
    const fullName = [app.firstName, app.middleName, app.lastName, app.suffix].filter(Boolean).join(" ");
    drawSectionTitle("I. Personal Information");
    drawFieldTwoCol("Full Name", fullName, "Date of Birth", app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null);
    drawFieldTwoCol("Place of Birth", app.placeOfBirth, "Sex", app.gender);
    drawFieldTwoCol("Civil Status", app.civilStatus, "Citizenship", app.citizenship);
    drawFieldTwoCol("Religion", app.religion, "", null);
    y -= 8;

    // ====== CONTACT INFORMATION ======
    drawSectionTitle("II. Contact Information");
    drawFieldTwoCol("Email", app.email || app.applicantEmail, "Phone", app.phone);
    drawFieldTwoCol("Alternate Phone", app.alternatePhone, "", null);
    drawField("Address", app.residenceAddress);
    drawFieldTwoCol("City/Municipality", app.residenceCity, "Zip Code", app.residenceZip);
    y -= 8;

    // ====== FAMILY BACKGROUND ======
    drawSectionTitle("III. Family Background");
    drawText("Father's Information", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
    y -= 12;
    drawFieldTwoCol("Full Name", app.fatherName, "Occupation", app.fatherOccupation);
    drawField("Contact", app.fatherContact);
    y -= 4;
    drawText("Mother's Information", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
    y -= 12;
    drawFieldTwoCol("Full Name", app.motherName, "Maiden Name", app.motherMaidenName);
    drawFieldTwoCol("Occupation", app.motherOccupation, "Contact", app.motherContact);
    if (app.guardianName) {
      y -= 4;
      drawText("Guardian's Information", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      drawFieldTwoCol("Full Name", app.guardianName, "Relationship", app.guardianRelation);
      drawFieldTwoCol("Contact", app.guardianContact, "No. of Siblings", app.siblingsCount?.toString());
    }
    y -= 8;

    // ====== EDUCATIONAL BACKGROUND ======
    drawSectionTitle("IV. Educational Background");
    drawText("Elementary", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
    y -= 12;
    drawFieldTwoCol("School", app.elementarySchool, "Year Graduated", app.elementaryYear);
    y -= 4;
    drawText("High School", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
    y -= 12;
    drawFieldTwoCol("School", app.highSchool, "Year Graduated", app.highSchoolYear);
    y -= 4;
    drawText("Senior High School", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
    y -= 12;
    drawFieldTwoCol("School", app.seniorHigh, "Year Graduated", app.seniorHighYear);
    drawFieldTwoCol("Strand/Track", app.seniorHighTrack, "", null);
    y -= 8;

    // ====== CURRENT EDUCATION ======
    drawSectionTitle("V. Current Education");
    drawFieldTwoCol("Student Number", app.studentNumber, "College", app.college);
    drawFieldTwoCol("Program", app.program, "Year Level", app.yearLevel);
    drawFieldTwoCol("Section", app.section, "GWA", app.gwa);
    y -= 8;

    // ====== WEEKLY AVAILABILITY ======
    if (app.availabilityJson) {
      drawSectionTitle("VI. Weekly Availability");
      try {
        const avail = JSON.parse(app.availabilityJson) as Record<string, string[]>;
        const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
        const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        dayKeys.forEach((dk, i) => {
          const slots = avail[dk] || [];
          drawField(dayLabels[i], slots.length > 0 ? slots.join(", ") : "None");
        });
      } catch {
        drawField("Availability", "N/A");
      }
      y -= 8;
    }

    // ====== EMPLOYMENT & SKILLS ======
    if (app.employmentJson) {
      drawSectionTitle("VII. Skills & Employment History");
      try {
        const employments = JSON.parse(app.employmentJson) as Array<{ company?: string; position?: string; duration?: string; description?: string }>;
        if (employments.length > 0) {
          employments.forEach((emp, i) => {
            checkPageBreak(40);
            drawText(`Employment #${i + 1}`, margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
            y -= 12;
            drawFieldTwoCol("Company", emp.company, "Position", emp.position);
            drawFieldTwoCol("Duration", emp.duration, "Description", emp.description);
            y -= 4;
          });
        } else {
          drawField("Employment History", "None");
        }
      } catch {
        drawField("Employment History", "N/A");
      }
      y -= 8;
    }

    // ====== ESSAYS ======
    drawSectionTitle("VIII. Essay Questions");
    if (app.essayWhyApply) {
      drawText("Why do you want to become a Student Assistant?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      const lines1 = wrapText(app.essayWhyApply, contentWidth, font, fontSizeSmall);
      lines1.forEach((line) => {
        checkPageBreak(12);
        drawText(line, margin, y, font, fontSizeSmall);
        y -= 11;
      });
      y -= 6;
    }
    if (app.essayGoals) {
      drawText("What are your goals as a Student Assistant?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      const lines2 = wrapText(app.essayGoals, contentWidth, font, fontSizeSmall);
      lines2.forEach((line) => {
        checkPageBreak(12);
        drawText(line, margin, y, font, fontSizeSmall);
        y -= 11;
      });
      y -= 6;
    }
    if (app.essaySkills) {
      drawText("What skills can you contribute?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      const lines3 = wrapText(app.essaySkills, contentWidth, font, fontSizeSmall);
      lines3.forEach((line) => {
        checkPageBreak(12);
        drawText(line, margin, y, font, fontSizeSmall);
        y -= 11;
      });
      y -= 6;
    }
    if (app.essayChallenges) {
      drawText("How do you plan to balance academics and SA duties?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      const lines4 = wrapText(app.essayChallenges, contentWidth, font, fontSizeSmall);
      lines4.forEach((line) => {
        checkPageBreak(12);
        drawText(line, margin, y, font, fontSizeSmall);
        y -= 11;
      });
      y -= 6;
    }

    // ====== DOCUMENTS UPLOADED ======
    y -= 4;
    drawSectionTitle("IX. Documents Uploaded");
    drawFieldTwoCol("2x2 ID Photo", app.photoUrl ? "Submitted" : "Not submitted", "Resume/CV", app.resumeUrl ? "Submitted" : "Not submitted");
    drawFieldTwoCol("Grade Report", app.gradeReportUrl ? "Submitted" : "Not submitted", "Registration Form", app.registrationUrl ? "Submitted" : "Not submitted");

    // ====== FOOTER ======
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);
      drawText(`Page ${i + 1} of ${totalPages}`, pageWidth / 2 - 30, 25, font, fontSizeSmall, rgb(0.5, 0.5, 0.5));
      drawText(`Generated: ${new Date().toLocaleDateString("en-US")}`, pageWidth / 2 - 30, 14, font, fontSizeSmall, rgb(0.5, 0.5, 0.5));
    }

    const pdfBytes = await pdfDoc.save();
    
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="application-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

// Simple text wrapper
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
