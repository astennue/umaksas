import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/cms/system-settings - Get system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await db.systemSettings.findFirst();

    // Create default if not exists
    if (!settings) {
      settings = await db.systemSettings.create({
        data: {
          siteName: "UMAK Student Assistant Management System",
          academicYear: "2025-2026",
          currentSemester: "2nd Semester",
          applicationOpen: false,
          renewalOpen: false,
          maxWorkHoursPerDay: 4,
          monthlyPaymentFee: 20.00,
          rubricAcademic: 25,
          rubricInterview: 25,
          rubricSkills: 25,
          rubricCharacter: 25,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 }
    );
  }
}

// PUT /api/cms/system-settings - Update system settings (SUPER_ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can update system settings" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate rubric weights total to 100
    const rubricAcademic = typeof body.rubricAcademic === "number" ? body.rubricAcademic : undefined;
    const rubricInterview = typeof body.rubricInterview === "number" ? body.rubricInterview : undefined;
    const rubricSkills = typeof body.rubricSkills === "number" ? body.rubricSkills : undefined;
    const rubricCharacter = typeof body.rubricCharacter === "number" ? body.rubricCharacter : undefined;

    if (rubricAcademic !== undefined && rubricInterview !== undefined && rubricSkills !== undefined && rubricCharacter !== undefined) {
      const total = rubricAcademic + rubricInterview + rubricSkills + rubricCharacter;
      if (total !== 100) {
        return NextResponse.json(
          { error: `Rubric weights must total 100%. Current total: ${total}%` },
          { status: 400 }
        );
      }
    }

    let settings = await db.systemSettings.findFirst();

    if (!settings) {
      settings = await db.systemSettings.create({
        data: {
          siteName: body.siteName || "UMAK Student Assistant Management System",
          siteDescription: body.siteDescription || null,
          logoUrl: body.logoUrl || null,
          contactEmail: body.contactEmail || null,
          contactPhone: body.contactPhone || null,
          contactAddress: body.contactAddress || null,
          facebookUrl: body.facebookUrl || null,
          twitterUrl: body.twitterUrl || null,
          instagramUrl: body.instagramUrl || null,
          linkedinUrl: body.linkedinUrl || null,
          academicYear: body.academicYear || null,
          currentSemester: body.currentSemester || null,
          applicationOpen: body.applicationOpen ?? false,
          renewalOpen: body.renewalOpen ?? false,
          maxWorkHoursPerDay: body.maxWorkHoursPerDay ?? 4,
          monthlyPaymentFee: body.monthlyPaymentFee ?? 20.00,
          rubricAcademic: body.rubricAcademic ?? 25,
          rubricInterview: body.rubricInterview ?? 25,
          rubricSkills: body.rubricSkills ?? 25,
          rubricCharacter: body.rubricCharacter ?? 25,
        },
      });
    } else {
      settings = await db.systemSettings.update({
        where: { id: settings.id },
        data: {
          ...(body.siteName !== undefined && { siteName: body.siteName }),
          ...(body.siteDescription !== undefined && { siteDescription: body.siteDescription || null }),
          ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl || null }),
          ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail || null }),
          ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone || null }),
          ...(body.contactAddress !== undefined && { contactAddress: body.contactAddress || null }),
          ...(body.facebookUrl !== undefined && { facebookUrl: body.facebookUrl || null }),
          ...(body.twitterUrl !== undefined && { twitterUrl: body.twitterUrl || null }),
          ...(body.instagramUrl !== undefined && { instagramUrl: body.instagramUrl || null }),
          ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl || null }),
          ...(body.academicYear !== undefined && { academicYear: body.academicYear || null }),
          ...(body.currentSemester !== undefined && { currentSemester: body.currentSemester || null }),
          ...(body.applicationOpen !== undefined && { applicationOpen: body.applicationOpen }),
          ...(body.renewalOpen !== undefined && { renewalOpen: body.renewalOpen }),
          ...(body.maxWorkHoursPerDay !== undefined && { maxWorkHoursPerDay: body.maxWorkHoursPerDay }),
          ...(body.monthlyPaymentFee !== undefined && { monthlyPaymentFee: body.monthlyPaymentFee }),
          ...(body.rubricAcademic !== undefined && { rubricAcademic: body.rubricAcademic }),
          ...(body.rubricInterview !== undefined && { rubricInterview: body.rubricInterview }),
          ...(body.rubricSkills !== undefined && { rubricSkills: body.rubricSkills }),
          ...(body.rubricCharacter !== undefined && { rubricCharacter: body.rubricCharacter }),
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "Failed to update system settings" },
      { status: 500 }
    );
  }
}
