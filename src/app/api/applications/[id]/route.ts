import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/applications/[id] - Fetch a single application by ID
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
    const adminRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER", "HRMO"];
    if (!userRole || !adminRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const application = await db.application.findUnique({
      where: { id },
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
        // Personal Information
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
        // Contact Information
        email: true,
        phone: true,
        alternatePhone: true,
        // Residence
        residenceAddress: true,
        residenceCity: true,
        residenceZip: true,
        // Family Background
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
        // Educational Background
        elementarySchool: true,
        elementaryYear: true,
        highSchool: true,
        highSchoolYear: true,
        seniorHigh: true,
        seniorHighYear: true,
        seniorHighTrack: true,
        // Current Education
        studentNumber: true,
        college: true,
        program: true,
        yearLevel: true,
        section: true,
        gwa: true,
        // Employment & Skills
        employmentJson: true,
        // Availability
        availabilityJson: true,
        // Trainings
        trainingsJson: true,
        // References
        referencesJson: true,
        // Essays
        essayWhyApply: true,
        essayGoals: true,
        essaySkills: true,
        essayChallenges: true,
        // Upload fields
        photoUrl: true,
        resumeUrl: true,
        gradeReportUrl: true,
        registrationUrl: true,
        residenceImageUrl: true,
        // Review
        reviewNotes: true,
        interviewStatus: true,
        interviewScore: true,
        interviewDate: true,
        interviewNotes: true,
        totalScore: true,
        rank: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}
