import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PDFPage, Color } from "pdf-lib";

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

    // Helper: get the current (last) page in the document
    const getCurrentPage = (): PDFPage => {
      const pages = pdfDoc.getPages();
      return pages[pages.length - 1];
    };

    const checkPageBreak = (needed: number) => {
      if (y - needed < margin + 20) {
        pdfDoc.addPage();
        y = pageHeight - margin;
      }
    };

    // Sanitize text for Helvetica (Latin-1 only)
    const sanitizeText = (text: string | null | undefined): string => {
      if (!text) return "";
      return String(text).replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
    };

    // Safe drawText that wraps text if it exceeds maxWidth, draws on the CURRENT page
    const drawTextSafe = (
      text: string | null | undefined,
      x: number,
      yPos: number,
      f: typeof font = font,
      s: number = fontSize,
      color: Color = rgb(0, 0, 0),
      maxWidth?: number
    ): number => {
      try {
        if (!text || text.trim() === "") return yPos;
        const safeText = sanitizeText(text);
        if (safeText.trim() === "") return yPos;

        const page = getCurrentPage();
        const mw = maxWidth || (pageWidth - margin - x);
        const lines = wrapTextSafe(safeText, mw, f, s);
        let currentY = yPos;
        for (const line of lines) {
          try {
            page.drawText(line, { x, y: currentY, size: s, font: f, color });
          } catch {
            // If single line fails, try with further sanitization
            try {
              const cleaned = line.replace(/[^\x20-\x7E]/g, "?");
              page.drawText(cleaned, { x, y: currentY, size: s, font: f, color });
            } catch {
              // Skip this line entirely
            }
          }
          currentY -= s + 2;
        }
        return currentY;
      } catch {
        return yPos;
      }
    };

    const drawLine = (x1: number, yPos: number, width: number) => {
      try {
        const page = getCurrentPage();
        page.drawLine({
          start: { x: x1, y: yPos },
          end: { x: x1 + width, y: yPos },
          thickness: 1,
          color: rgb(0.4, 0.4, 0.4),
        });
      } catch {
        // Skip if drawLine fails
      }
    };

    // ====== HEADER ======
    try {
      drawTextSafe("UNIVERSITY OF MAKATI", margin, y, fontBold, fontSizeTitle, rgb(0, 0.15, 0.4));
      y -= 18;
      drawTextSafe("UMAK STUDENT ASSISTANTSHIP SOCIETY", margin, y, fontBold, fontSizeSubtitle, rgb(0, 0.15, 0.4));
      y -= 16;
      drawTextSafe("APPLICATION FORM", margin, y, fontBold, fontSize, rgb(0.2, 0.2, 0.2));
      y -= 8;
      drawLine(margin, y, contentWidth);
      y -= 20;

      // Applicant Summary Header
      const fullName = [app.firstName, app.middleName ? `${app.middleName.charAt(0)}.` : null, app.lastName, app.suffix].filter(Boolean).join(" ");
      drawTextSafe(fullName || "Unknown Applicant", margin, y, fontBold, 14, rgb(0, 0.15, 0.4));
      y -= 16;

      // Summary row 1: College, Program, Year Level
      const summaryParts: string[] = [];
      if (app.college) summaryParts.push(app.college);
      if (app.program) summaryParts.push(app.program);
      if (app.yearLevel) summaryParts.push(app.yearLevel);
      if (summaryParts.length > 0) {
        drawTextSafe(summaryParts.join(" | "), margin, y, font, fontSizeSmall, rgb(0.3, 0.3, 0.3));
        y -= 12;
      }

      // Summary row 2: Student Number, Email, Phone
      const contactParts: string[] = [];
      if (app.studentNumber) contactParts.push(`SN: ${app.studentNumber}`);
      if (app.email || app.applicantEmail) contactParts.push(app.email || app.applicantEmail);
      if (app.phone) contactParts.push(app.phone);
      if (contactParts.length > 0) {
        drawTextSafe(contactParts.join("  |  "), margin, y, font, fontSizeSmall, rgb(0.3, 0.3, 0.3));
        y -= 12;
      }

      // Summary row 3: Address, Civil Status, Gender
      const detailParts: string[] = [];
      if (app.gender) detailParts.push(app.gender);
      if (app.civilStatus) detailParts.push(app.civilStatus);
      if (app.citizenship) detailParts.push(app.citizenship);
      if (app.placeOfBirth) detailParts.push(`Born in ${app.placeOfBirth}`);
      if (detailParts.length > 0) {
        drawTextSafe(detailParts.join("  |  "), margin, y, font, fontSizeSmall, rgb(0.3, 0.3, 0.3));
        y -= 12;
      }

      // Summary row 4: Status, Submitted Date, Tracking Ref
      const statusLabel = app.status.replace(/_/g, " ");
      const submittedLabel = app.submittedAt ? `Submitted: ${new Date(app.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : "Not yet submitted";
      const trackingRef = app.id.slice(0, 8).toUpperCase();
      drawTextSafe(`Status: ${statusLabel}  |  ${submittedLabel}  |  Ref: ${trackingRef}`, margin, y, font, fontSizeSmall, rgb(0.3, 0.3, 0.3));
      y -= 8;
      drawLine(margin, y, contentWidth);
      y -= 10;
    } catch (err) {
      console.error("Error drawing PDF header:", err);
    }

    // ====== SECTION HELPER ======
    const drawSectionTitle = (title: string) => {
      checkPageBreak(30);
      y -= 6;
      drawTextSafe(title.toUpperCase(), margin, y, fontBold, fontSize, rgb(0, 0.15, 0.4));
      y -= 2;
      drawLine(margin, y, contentWidth);
      y -= 14;
    };

    const drawField = (label: string, value: string | null | undefined) => {
      checkPageBreak(16);
      const safeValue = sanitizeText(value) || "N/A";
      const labelText = label + ":";
      try {
        const labelW = font.widthOfTextAtSize(labelText + " ", fontSizeSmall);
        const availWidth = contentWidth - labelW;
        const valueLines = wrapTextSafe(safeValue, availWidth, font, fontSizeSmall);

        const page = getCurrentPage();
        try {
          page.drawText(labelText, { x: margin, y, size: fontSizeSmall, font, color: rgb(0.3, 0.3, 0.3) });
          page.drawText(valueLines[0] || "N/A", { x: margin + labelW + 4, y, size: fontSizeSmall, font });
        } catch {
          // Skip if drawing fails
        }
        y -= 13;
        // If value wrapped to multiple lines, account for them
        if (valueLines.length > 1) {
          for (let i = 1; i < valueLines.length; i++) {
            checkPageBreak(13);
            try {
              const page = getCurrentPage();
              page.drawText(valueLines[i], { x: margin + labelW + 4, y, size: fontSizeSmall, font });
            } catch { /* skip */ }
            y -= 13;
          }
        }
      } catch {
        y -= 13;
      }
    };

    const drawFieldTwoCol = (label1: string, value1: string | null | undefined, label2: string, value2: string | null | undefined) => {
      checkPageBreak(16);
      const halfWidth = contentWidth / 2;
      const safeValue1 = sanitizeText(value1 ?? "N/A").substring(0, 30);
      const safeValue2 = sanitizeText(value2 ?? "N/A").substring(0, 30);

      try {
        const page = getCurrentPage();
        const label1Text = label1 + ":";
        const label1W = font.widthOfTextAtSize(label1Text + " ", fontSizeSmall);
        page.drawText(label1Text, { x: margin, y, size: fontSizeSmall, font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(safeValue1, { x: margin + label1W + 4, y, size: fontSizeSmall, font });

        if (label2) {
          const label2Text = label2 + ":";
          const label2W = font.widthOfTextAtSize(label2Text + " ", fontSizeSmall);
          page.drawText(label2Text, { x: margin + halfWidth, y, size: fontSizeSmall, font, color: rgb(0.3, 0.3, 0.3) });
          page.drawText(safeValue2, { x: margin + halfWidth + label2W + 4, y, size: fontSizeSmall, font });
        }
      } catch {
        // If two-col overflows, draw on separate lines
        try {
          const page = getCurrentPage();
          page.drawText(`${label1}: ${safeValue1}`, { x: margin, y, size: fontSizeSmall, font });
          y -= 12;
          if (label2) {
            const page = getCurrentPage();
            page.drawText(`${label2}: ${safeValue2}`, { x: margin, y, size: fontSizeSmall, font });
          }
        } catch { /* skip */ }
      }
      y -= 13;
    };

    // ====== PERSONAL INFORMATION ======
    try {
      drawSectionTitle("I. Personal Information");
      drawFieldTwoCol("Full Name", [app.firstName, app.middleName, app.lastName, app.suffix].filter(Boolean).join(" "), "Date of Birth", app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null);
      drawFieldTwoCol("Place of Birth", app.placeOfBirth, "Sex", app.gender);
      drawFieldTwoCol("Civil Status", app.civilStatus, "Citizenship", app.citizenship);
      if (app.religion) drawFieldTwoCol("Religion", app.religion, "", null);
      y -= 8;
    } catch (err) {
      console.error("Error drawing personal info:", err);
    }

    // ====== CONTACT INFORMATION ======
    try {
      drawSectionTitle("II. Contact Information");
      drawFieldTwoCol("Email", app.email || app.applicantEmail, "Phone", app.phone);
      if (app.alternatePhone) drawFieldTwoCol("Alternate Phone", app.alternatePhone, "", null);
      drawField("Address", app.residenceAddress);
      drawFieldTwoCol("City/Municipality", app.residenceCity, "Zip Code", app.residenceZip);
      y -= 8;
    } catch (err) {
      console.error("Error drawing contact info:", err);
    }

    // ====== FAMILY BACKGROUND ======
    try {
      drawSectionTitle("III. Family Background");
      drawTextSafe("Father's Information", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      drawFieldTwoCol("Full Name", app.fatherName, "Occupation", app.fatherOccupation);
      if (app.fatherContact) drawField("Contact", app.fatherContact);
      y -= 4;
      drawTextSafe("Mother's Information", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      drawFieldTwoCol("Full Name", app.motherName, "Maiden Name", app.motherMaidenName);
      drawFieldTwoCol("Occupation", app.motherOccupation, "Contact", app.motherContact);
      if (app.guardianName) {
        y -= 4;
        drawTextSafe("Guardian's Information", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
        y -= 12;
        drawFieldTwoCol("Full Name", app.guardianName, "Relationship", app.guardianRelation);
        drawFieldTwoCol("Contact", app.guardianContact, "No. of Siblings", app.siblingsCount?.toString());
      }
      y -= 8;
    } catch (err) {
      console.error("Error drawing family info:", err);
    }

    // ====== EDUCATIONAL BACKGROUND ======
    try {
      drawSectionTitle("IV. Educational Background");
      drawTextSafe("Elementary", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      drawFieldTwoCol("School", app.elementarySchool, "Year Graduated", app.elementaryYear);
      y -= 4;
      drawTextSafe("High School", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      drawFieldTwoCol("School", app.highSchool, "Year Graduated", app.highSchoolYear);
      y -= 4;
      drawTextSafe("Senior High School", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
      y -= 12;
      drawFieldTwoCol("School", app.seniorHigh, "Year Graduated", app.seniorHighYear);
      if (app.seniorHighTrack) drawFieldTwoCol("Strand/Track", app.seniorHighTrack, "", null);
      y -= 8;
    } catch (err) {
      console.error("Error drawing education info:", err);
    }

    // ====== CURRENT EDUCATION ======
    try {
      drawSectionTitle("V. Current Education");
      drawFieldTwoCol("Student Number", app.studentNumber, "College", app.college);
      drawFieldTwoCol("Program", app.program, "Year Level", app.yearLevel);
      drawFieldTwoCol("Section", app.section, "GWA", app.gwa);
      y -= 8;
    } catch (err) {
      console.error("Error drawing current education:", err);
    }

    // ====== WEEKLY AVAILABILITY ======
    try {
      if (app.availabilityJson) {
        drawSectionTitle("VI. Weekly Availability");
        const avail = JSON.parse(app.availabilityJson) as Record<string, string[]>;
        const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
        const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        dayKeys.forEach((dk, i) => {
          const slots = avail[dk] || [];
          drawField(dayLabels[i], slots.length > 0 ? slots.join(", ") : "None");
        });
        y -= 8;
      }
    } catch (err) {
      console.error("Error drawing availability:", err);
    }

    // ====== EMPLOYMENT & SKILLS ======
    try {
      if (app.employmentJson) {
        drawSectionTitle("VII. Skills & Employment History");
        const employments = JSON.parse(app.employmentJson) as Array<{ company?: string; position?: string; duration?: string; description?: string }>;
        if (employments.length > 0) {
          employments.forEach((emp, i) => {
            checkPageBreak(40);
            drawTextSafe(`Employment #${i + 1}`, margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
            y -= 12;
            drawFieldTwoCol("Company", emp.company, "Position", emp.position);
            drawFieldTwoCol("Duration", emp.duration, "Description", emp.description);
            y -= 4;
          });
        } else {
          drawField("Employment History", "None");
        }
        y -= 8;
      }
    } catch (err) {
      console.error("Error drawing employment:", err);
    }

    // ====== ESSAYS ======
    try {
      drawSectionTitle("VIII. Essay Questions");
      if (app.essayWhyApply) {
        drawTextSafe("Why do you want to become a Student Assistant?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
        y -= 12;
        const lines1 = wrapTextSafe(sanitizeText(app.essayWhyApply), contentWidth, font, fontSizeSmall);
        lines1.forEach((line) => {
          checkPageBreak(12);
          drawTextSafe(line, margin, y, font, fontSizeSmall);
          y -= 11;
        });
        y -= 6;
      }
      if (app.essayGoals) {
        drawTextSafe("What are your goals as a Student Assistant?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
        y -= 12;
        const lines2 = wrapTextSafe(sanitizeText(app.essayGoals), contentWidth, font, fontSizeSmall);
        lines2.forEach((line) => {
          checkPageBreak(12);
          drawTextSafe(line, margin, y, font, fontSizeSmall);
          y -= 11;
        });
        y -= 6;
      }
      if (app.essaySkills) {
        drawTextSafe("What skills can you contribute?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
        y -= 12;
        const lines3 = wrapTextSafe(sanitizeText(app.essaySkills), contentWidth, font, fontSizeSmall);
        lines3.forEach((line) => {
          checkPageBreak(12);
          drawTextSafe(line, margin, y, font, fontSizeSmall);
          y -= 11;
        });
        y -= 6;
      }
      if (app.essayChallenges) {
        drawTextSafe("How do you plan to balance academics and SA duties?", margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
        y -= 12;
        const lines4 = wrapTextSafe(sanitizeText(app.essayChallenges), contentWidth, font, fontSizeSmall);
        lines4.forEach((line) => {
          checkPageBreak(12);
          drawTextSafe(line, margin, y, font, fontSizeSmall);
          y -= 11;
        });
        y -= 6;
      }
    } catch (err) {
      console.error("Error drawing essays:", err);
    }

    // ====== TRAININGS & SEMINARS ======
    try {
      if (app.trainingsJson) {
        drawSectionTitle("IX. Trainings & Seminars");
        const trainings = JSON.parse(app.trainingsJson) as Array<{ title?: string; organizer?: string; date?: string; description?: string }>;
        if (trainings.length > 0) {
          trainings.forEach((t, i) => {
            checkPageBreak(40);
            drawTextSafe(`Training #${i + 1}`, margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
            y -= 12;
            drawFieldTwoCol("Title", t.title, "Organizer", t.organizer);
            drawFieldTwoCol("Date", t.date, "Description", t.description);
            y -= 4;
          });
        } else {
          drawField("Trainings", "None");
        }
        y -= 8;
      }
    } catch (err) {
      console.error("Error drawing trainings:", err);
    }

    // ====== CHARACTER REFERENCES ======
    try {
      if (app.referencesJson) {
        drawSectionTitle("X. Character References");
        const refs = JSON.parse(app.referencesJson) as Array<{ name?: string; position?: string; company?: string; contact?: string; email?: string }>;
        if (refs.length > 0) {
          refs.forEach((r, i) => {
            checkPageBreak(40);
            drawTextSafe(`Reference #${i + 1}`, margin, y, fontBold, fontSizeSmall, rgb(0.2, 0.2, 0.2));
            y -= 12;
            drawFieldTwoCol("Name", r.name, "Position", r.position);
            drawFieldTwoCol("Company/Institution", r.company, "Contact", r.contact);
            if (r.email) drawField("Email", r.email);
            y -= 4;
          });
        } else {
          drawField("References", "None");
        }
        y -= 8;
      }
    } catch (err) {
      console.error("Error drawing references:", err);
    }

    // REVIEW NOTES — stored in notifications, not in Application record
    // (skipped here; review notes are sent to the applicant via notification)

    // ====== FOOTER ======
    try {
      const totalPages = pdfDoc.getPageCount();
      for (let i = 0; i < totalPages; i++) {
        try {
          const page = pdfDoc.getPage(i);
          const pageW = 595.28;
          const footerText1 = sanitizeText(`Page ${i + 1} of ${totalPages}`);
          const footerText2 = sanitizeText(`Generated: ${new Date().toLocaleDateString("en-US")}`);

          try {
            page.drawText(footerText1, { x: pageW / 2 - 30, y: 25, size: fontSizeSmall, font, color: rgb(0.5, 0.5, 0.5) });
          } catch { /* skip */ }
          try {
            page.drawText(footerText2, { x: pageW / 2 - 30, y: 14, size: fontSizeSmall, font, color: rgb(0.5, 0.5, 0.5) });
          } catch { /* skip */ }
        } catch {
          // Skip this page's footer
        }
      }
    } catch (err) {
      console.error("Error drawing footer:", err);
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="application-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: String(error) },
      { status: 500 }
    );
  }
}

// Simple text wrapper for essays (long text)
function wrapText(text: string, maxWidth: number, f: any, fontSize: number): string[] {
  if (!text) return [];
  try {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      try {
        const testWidth = f.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      } catch {
        // If width measurement fails, fall back to char count
        if (currentLine.length + word.length + 1 > Math.floor(maxWidth / (fontSize * 0.5)) && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  } catch {
    // If font measurement fails entirely, split by character count
    const lines: string[] = [];
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
    for (let i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.substring(i, i + charsPerLine));
    }
    return lines;
  }
}

// Safe text wrapper that sanitizes non-Latin1 characters for Helvetica
function wrapTextSafe(text: string, maxWidth: number, f: any, fontSize: number): string[] {
  if (!text) return [];
  // Replace any character outside the printable Latin-1 range
  const sanitized = text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
  return wrapText(sanitized, maxWidth, f, fontSize);
}
