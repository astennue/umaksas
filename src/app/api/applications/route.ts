import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/applications - Create new application
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { email, firstName, lastName, currentStep, employment, trainings, references, availability, ...rest } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if application already exists for this email
    const existing = await db.application.findUnique({
      where: { applicantEmail: email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An application already exists for this email", id: existing.id, status: existing.status },
        { status: 409 }
      );
    }

    // Create application
    const application = await db.application.create({
      data: {
        applicantEmail: email,
        firstName: rest.firstName || firstName || "",
        middleName: rest.middleName || "",
        lastName: rest.lastName || lastName || "",
        suffix: rest.suffix || "",
        dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : null,
        placeOfBirth: rest.placeOfBirth || "",
        gender: rest.gender || "",
        civilStatus: rest.civilStatus || "",
        citizenship: rest.citizenship || "",
        religion: rest.religion || "",
        email: rest.email || email || "",
        phone: rest.phone || "",
        fatherName: rest.fatherName || "",
        fatherOccupation: rest.fatherOccupation || "",
        fatherContact: rest.fatherContact || "",
        motherName: rest.motherName || "",
        motherMaidenName: rest.motherMaidenName || "",
        motherOccupation: rest.motherOccupation || "",
        motherContact: rest.motherContact || "",
        guardianName: rest.guardianName || "",
        guardianRelation: rest.guardianRelation || "",
        guardianContact: rest.guardianContact || "",
        siblingsCount: rest.siblingsCount ? parseInt(rest.siblingsCount) : null,
        elementarySchool: rest.elementarySchool || "",
        elementaryYear: rest.elementaryYear || "",
        highSchool: rest.highSchool || "",
        highSchoolYear: rest.highSchoolYear || "",
        seniorHigh: rest.seniorHigh || "",
        seniorHighYear: rest.seniorHighYear || "",
        seniorHighTrack: rest.seniorHighTrack || "",
        studentNumber: rest.studentNumber || "",
        college: rest.college || "",
        program: rest.program || "",
        yearLevel: rest.yearLevel || "",
        section: rest.section || "",
        gwa: rest.gwa || "",
        employmentJson: employment ? JSON.stringify(employment) : null,
        availabilityJson: availability ? JSON.stringify(availability) : null,
        trainingsJson: trainings ? JSON.stringify(trainings) : null,
        referencesJson: references ? JSON.stringify(references) : null,
        essayWhyApply: rest.essayWhyApply || "",
        essayGoals: rest.essayGoals || "",
        essaySkills: rest.essaySkills || "",
        essayChallenges: rest.essayChallenges || "",
        residenceAddress: rest.residenceAddress || "",
        residenceCity: rest.residenceCity || "",
        residenceZip: rest.residenceZip || "",
        photoUrl: rest.photo || "",
        resumeUrl: rest.resume || "",
        gradeReportUrl: rest.gradeReport || "",
        currentStep: currentStep || 1,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ id: application.id, status: application.status }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}

// GET /api/applications?email=xxx - Get application by email
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email query parameter is required" }, { status: 400 });
    }

    const application = await db.application.findUnique({
      where: { applicantEmail: email },
    });

    if (!application) {
      return NextResponse.json({ error: "No application found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error: any) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

// PUT /api/applications - Update draft application
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, employment, trainings, references, availability, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    // Check if application exists
    const existing = await db.application.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot modify a submitted application" },
        { status: 400 }
      );
    }

    // Update application
    const application = await db.application.update({
      where: { id },
      data: {
        firstName: rest.firstName ?? existing.firstName,
        middleName: rest.middleName ?? existing.middleName,
        lastName: rest.lastName ?? existing.lastName,
        suffix: rest.suffix ?? existing.suffix,
        dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : existing.dateOfBirth,
        placeOfBirth: rest.placeOfBirth ?? existing.placeOfBirth,
        gender: rest.gender ?? existing.gender,
        civilStatus: rest.civilStatus ?? existing.civilStatus,
        citizenship: rest.citizenship ?? existing.citizenship,
        religion: rest.religion ?? existing.religion,
        email: rest.email ?? existing.email,
        phone: rest.phone ?? existing.phone,
        fatherName: rest.fatherName ?? existing.fatherName,
        fatherOccupation: rest.fatherOccupation ?? existing.fatherOccupation,
        fatherContact: rest.fatherContact ?? existing.fatherContact,
        motherName: rest.motherName ?? existing.motherName,
        motherMaidenName: rest.motherMaidenName ?? existing.motherMaidenName,
        motherOccupation: rest.motherOccupation ?? existing.motherOccupation,
        motherContact: rest.motherContact ?? existing.motherContact,
        guardianName: rest.guardianName ?? existing.guardianName,
        guardianRelation: rest.guardianRelation ?? existing.guardianRelation,
        guardianContact: rest.guardianContact ?? existing.guardianContact,
        siblingsCount: rest.siblingsCount != null ? parseInt(rest.siblingsCount) : existing.siblingsCount,
        elementarySchool: rest.elementarySchool ?? existing.elementarySchool,
        elementaryYear: rest.elementaryYear ?? existing.elementaryYear,
        highSchool: rest.highSchool ?? existing.highSchool,
        highSchoolYear: rest.highSchoolYear ?? existing.highSchoolYear,
        seniorHigh: rest.seniorHigh ?? existing.seniorHigh,
        seniorHighYear: rest.seniorHighYear ?? existing.seniorHighYear,
        seniorHighTrack: rest.seniorHighTrack ?? existing.seniorHighTrack,
        studentNumber: rest.studentNumber ?? existing.studentNumber,
        college: rest.college ?? existing.college,
        program: rest.program ?? existing.program,
        yearLevel: rest.yearLevel ?? existing.yearLevel,
        section: rest.section ?? existing.section,
        gwa: rest.gwa ?? existing.gwa,
        employmentJson: employment ? JSON.stringify(employment) : existing.employmentJson,
        availabilityJson: availability ? JSON.stringify(availability) : existing.availabilityJson,
        trainingsJson: trainings ? JSON.stringify(trainings) : existing.trainingsJson,
        referencesJson: references ? JSON.stringify(references) : existing.referencesJson,
        essayWhyApply: rest.essayWhyApply ?? existing.essayWhyApply,
        essayGoals: rest.essayGoals ?? existing.essayGoals,
        essaySkills: rest.essaySkills ?? existing.essaySkills,
        essayChallenges: rest.essayChallenges ?? existing.essayChallenges,
        residenceAddress: rest.residenceAddress ?? existing.residenceAddress,
        residenceCity: rest.residenceCity ?? existing.residenceCity,
        residenceZip: rest.residenceZip ?? existing.residenceZip,
        photoUrl: rest.photo ?? existing.photoUrl,
        resumeUrl: rest.resume ?? existing.resumeUrl,
        gradeReportUrl: rest.gradeReport ?? existing.gradeReportUrl,
        currentStep: rest.currentStep ?? existing.currentStep,
      },
    });

    return NextResponse.json({ id: application.id, status: application.status });
  } catch (error: any) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
