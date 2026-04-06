import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// POST /api/application-fields/seed — Seed default APPLICATION form fields if none exist
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const userRole = (session.user as { role?: string }).role;

    // Auth: SUPER_ADMIN, ADVISER, or OFFICER (PRESIDENT position only)
    if (userRole === "SUPER_ADMIN" || userRole === "ADVISER") {
      // Allowed
    } else if (userRole === "OFFICER" && userId) {
      const officer = await db.officerProfile.findFirst({
        where: { userId, position: "PRESIDENT" },
      });
      if (!officer) {
        return NextResponse.json(
          { error: "Forbidden. Only SUPER_ADMIN, ADVISER, or SAS President can manage application fields." },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Forbidden. Only SUPER_ADMIN, ADVISER, or SAS President can manage application fields." },
        { status: 403 }
      );
    }

    // Check if any APPLICATION context fields already exist
    const existingCount = await db.formField.count({
      where: { context: "APPLICATION" },
    });

    if (existingCount > 0) {
      // Return existing fields, no duplicates
      const existing = await db.formField.findMany({
        where: { context: "APPLICATION", isActive: true },
        orderBy: [{ orderIndex: "asc" }],
      });
      const parsed = existing.map((f) => ({
        ...f,
        configJson: f.configJson ? JSON.parse(f.configJson) : null,
      }));
      return NextResponse.json({
        message: "Fields already exist. Returning existing fields.",
        seeded: false,
        count: parsed.length,
        fields: parsed,
      });
    }

    // Define all default fields
    const defaultFields: {
      id: string;
      label: string;
      fieldType: string;
      context: string;
      configJson: string | null;
      isRequired: boolean;
      orderIndex: number;
      section: string;
      step: number;
      isActive: boolean;
    }[] = [];

    let orderIdx = 0;

    // ======== STEP 1 - Personal Information ========
    defaultFields.push(
      {
        id: "step1_firstname",
        label: "First Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "Juan" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_middlename",
        label: "Middle Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "Santos" }),
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_lastname",
        label: "Last Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "Dela Cruz" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_suffix",
        label: "Suffix",
        fieldType: "SELECT",
        context: "APPLICATION",
        configJson: JSON.stringify({ options: ["", "Jr.", "Sr.", "III", "IV"] }),
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_dateofbirth",
        label: "Date of Birth",
        fieldType: "DATE",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_placeofbirth",
        label: "Place of Birth",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "City, Province" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_sex",
        label: "Sex",
        fieldType: "SELECT",
        context: "APPLICATION",
        configJson: JSON.stringify({ options: ["Male", "Female"] }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_civilstatus",
        label: "Civil Status",
        fieldType: "SELECT",
        context: "APPLICATION",
        configJson: JSON.stringify({ options: ["Single", "Married", "Widowed", "Separated"] }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_religion",
        label: "Religion",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "e.g., Roman Catholic" }),
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      },
      {
        id: "step1_citizenship",
        label: "Citizenship",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "e.g., Filipino" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Personal Information",
        step: 1,
        isActive: true,
      }
    );

    // ======== STEP 2 - Contact Information ========
    defaultFields.push(
      {
        id: "step2_phone",
        label: "Phone Number",
        fieldType: "PHONE",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "09123456789" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Contact Information",
        step: 2,
        isActive: true,
      },
      {
        id: "step2_alternatephone",
        label: "Alternate Phone",
        fieldType: "PHONE",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Contact Information",
        step: 2,
        isActive: true,
      },
      {
        id: "step2_address",
        label: "Address",
        fieldType: "TEXTAREA",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "Street, Barangay, Subdivision..." }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Contact Information",
        step: 2,
        isActive: true,
      },
      {
        id: "step2_city",
        label: "City/Municipality",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "e.g., Makati City" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Contact Information",
        step: 2,
        isActive: true,
      },
      {
        id: "step2_zipcode",
        label: "Zip Code",
        fieldType: "NUMBER",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "e.g., 1210" }),
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Contact Information",
        step: 2,
        isActive: true,
      }
    );

    // ======== STEP 3 - Family Background ========
    // Father's Information
    defaultFields.push(
      {
        id: "step3_father_name",
        label: "Father's Full Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Father's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_father_occupation",
        label: "Father's Occupation",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Father's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_father_contact",
        label: "Father's Contact Number",
        fieldType: "PHONE",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Father's Information",
        step: 3,
        isActive: true,
      }
    );

    // Mother's Information
    defaultFields.push(
      {
        id: "step3_mother_name",
        label: "Mother's Full Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Mother's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_mother_maidenname",
        label: "Mother's Maiden Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Mother's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_mother_occupation",
        label: "Mother's Occupation",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Mother's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_mother_contact",
        label: "Mother's Contact Number",
        fieldType: "PHONE",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Mother's Information",
        step: 3,
        isActive: true,
      }
    );

    // Guardian's Information
    defaultFields.push(
      {
        id: "step3_guardian_name",
        label: "Guardian's Full Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Guardian's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_guardian_relation",
        label: "Relationship to Applicant",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Guardian's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_guardian_contact",
        label: "Guardian's Contact Number",
        fieldType: "PHONE",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Guardian's Information",
        step: 3,
        isActive: true,
      },
      {
        id: "step3_siblings_count",
        label: "Number of Siblings",
        fieldType: "NUMBER",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Guardian's Information",
        step: 3,
        isActive: true,
      }
    );

    // ======== STEP 4 - Educational Background ========
    // Elementary
    defaultFields.push(
      {
        id: "step4_elem_school",
        label: "School Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Elementary",
        step: 4,
        isActive: true,
      },
      {
        id: "step4_elem_year",
        label: "Year Graduated",
        fieldType: "NUMBER",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Elementary",
        step: 4,
        isActive: true,
      }
    );

    // High School
    defaultFields.push(
      {
        id: "step4_hs_school",
        label: "School Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "High School",
        step: 4,
        isActive: true,
      },
      {
        id: "step4_hs_year",
        label: "Year Graduated",
        fieldType: "NUMBER",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "High School",
        step: 4,
        isActive: true,
      }
    );

    // Senior High School
    defaultFields.push(
      {
        id: "step4_shs_school",
        label: "School Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Senior High School",
        step: 4,
        isActive: true,
      },
      {
        id: "step4_shs_year",
        label: "Year Graduated",
        fieldType: "NUMBER",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Senior High School",
        step: 4,
        isActive: true,
      },
      {
        id: "step4_shs_strand",
        label: "Strand/Track",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Senior High School",
        step: 4,
        isActive: true,
      }
    );

    // ======== STEP 5 - Current Education ========
    defaultFields.push(
      {
        id: "step5_studentnumber",
        label: "Student Number",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "e.g., K12042427" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Current Education",
        step: 5,
        isActive: true,
      },
      {
        id: "step5_college",
        label: "College",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Current Education",
        step: 5,
        isActive: true,
      },
      {
        id: "step5_program",
        label: "Program / Course",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Current Education",
        step: 5,
        isActive: true,
      },
      {
        id: "step5_yearlevel",
        label: "Year Level",
        fieldType: "SELECT",
        context: "APPLICATION",
        configJson: JSON.stringify({ options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Irregular"] }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Current Education",
        step: 5,
        isActive: true,
      },
      {
        id: "step5_section",
        label: "Section",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "e.g., CS-301" }),
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Current Education",
        step: 5,
        isActive: true,
      },
      {
        id: "step5_gwa",
        label: "GWA",
        fieldType: "NUMBER",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "1.00 - 5.00" }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Current Education",
        step: 5,
        isActive: true,
      }
    );

    // ======== STEP 6 - Availability ========
    defaultFields.push(
      {
        id: "step6_heading",
        label: "Weekly Availability",
        fieldType: "HEADING",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Weekly Availability",
        step: 6,
        isActive: true,
      },
      {
        id: "step6_paragraph",
        label: "Select your available time slots for the week.",
        fieldType: "PARAGRAPH",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Weekly Availability",
        step: 6,
        isActive: true,
      }
    );

    // ======== STEP 7 - Employment ========
    defaultFields.push(
      {
        id: "step7_heading",
        label: "Employment History",
        fieldType: "HEADING",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Employment History",
        step: 7,
        isActive: true,
      },
      {
        id: "step7_paragraph",
        label: "List your work experience (if any).",
        fieldType: "PARAGRAPH",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Employment History",
        step: 7,
        isActive: true,
      },
      {
        id: "step7_skills",
        label: "Skills",
        fieldType: "TEXTAREA",
        context: "APPLICATION",
        configJson: JSON.stringify({ placeholder: "List your relevant skills..." }),
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Employment History",
        step: 7,
        isActive: true,
      }
    );

    // ======== STEP 8 - Trainings ========
    defaultFields.push(
      {
        id: "step8_heading",
        label: "Trainings & Seminars",
        fieldType: "HEADING",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Trainings & Seminars",
        step: 8,
        isActive: true,
      },
      {
        id: "step8_paragraph",
        label: "List any trainings or seminars you have attended.",
        fieldType: "PARAGRAPH",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Trainings & Seminars",
        step: 8,
        isActive: true,
      }
    );

    // ======== STEP 9 - References ========
    defaultFields.push(
      {
        id: "step9_heading",
        label: "Character References",
        fieldType: "HEADING",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Character References",
        step: 9,
        isActive: true,
      },
      {
        id: "step9_paragraph",
        label: "Provide at least 4 character references.",
        fieldType: "PARAGRAPH",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "Character References",
        step: 9,
        isActive: true,
      }
    );

    // ======== STEP 10 - Documents ========
    defaultFields.push(
      {
        id: "step10_photo",
        label: "2x2 ID Photo",
        fieldType: "FILE_UPLOAD",
        context: "APPLICATION",
        configJson: JSON.stringify({ helpText: "JPG/PNG/WebP, max 2MB", allowedFormats: ["jpg", "jpeg", "png", "webp"], maxFileSize: 2 }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Document Upload",
        step: 10,
        isActive: true,
      },
      {
        id: "step10_resume",
        label: "Resume / CV",
        fieldType: "FILE_UPLOAD",
        context: "APPLICATION",
        configJson: JSON.stringify({ helpText: "PDF, max 5MB", allowedFormats: ["pdf"], maxFileSize: 5 }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Document Upload",
        step: 10,
        isActive: true,
      },
      {
        id: "step10_grades",
        label: "Report Card / Grades",
        fieldType: "FILE_UPLOAD",
        context: "APPLICATION",
        configJson: JSON.stringify({ helpText: "PDF, max 5MB", allowedFormats: ["pdf"], maxFileSize: 5 }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Document Upload",
        step: 10,
        isActive: true,
      }
    );

    // ======== STEP 11 - Essays ========
    defaultFields.push(
      {
        id: "step11_essay_why",
        label: "Why do you want to become a Student Assistant?",
        fieldType: "TEXTAREA",
        context: "APPLICATION",
        configJson: JSON.stringify({ minLength: 50 }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Essay Questions",
        step: 11,
        isActive: true,
      },
      {
        id: "step11_essay_goals",
        label: "What are your goals as a Student Assistant?",
        fieldType: "TEXTAREA",
        context: "APPLICATION",
        configJson: JSON.stringify({ minLength: 50 }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Essay Questions",
        step: 11,
        isActive: true,
      },
      {
        id: "step11_essay_skills",
        label: "What skills can you contribute to the SA program?",
        fieldType: "TEXTAREA",
        context: "APPLICATION",
        configJson: JSON.stringify({ minLength: 50 }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Essay Questions",
        step: 11,
        isActive: true,
      },
      {
        id: "step11_essay_balance",
        label: "How do you plan to balance academics and SA duties?",
        fieldType: "TEXTAREA",
        context: "APPLICATION",
        configJson: JSON.stringify({ minLength: 50 }),
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Essay Questions",
        step: 11,
        isActive: true,
      }
    );

    // ======== STEP 12 - Review ========
    defaultFields.push(
      {
        id: "step12_email",
        label: "Contact Email",
        fieldType: "EMAIL",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Review & Confirm",
        step: 12,
        isActive: true,
      },
      {
        id: "step12_confirm_accuracy",
        label: "I confirm all information is accurate",
        fieldType: "CHECKBOX",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Review & Confirm",
        step: 12,
        isActive: true,
      },
      {
        id: "step12_agree_terms",
        label: "I agree to terms and conditions",
        fieldType: "CHECKBOX",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "Review & Confirm",
        step: 12,
        isActive: true,
      }
    );

    // ======== STEP 13 - Signature ========
    defaultFields.push(
      {
        id: "step13_heading",
        label: "Electronic Signature",
        fieldType: "HEADING",
        context: "APPLICATION",
        configJson: null,
        isRequired: false,
        orderIndex: orderIdx++,
        section: "E-Signature",
        step: 13,
        isActive: true,
      },
      {
        id: "step13_printed_name",
        label: "Printed Name",
        fieldType: "TEXT",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "E-Signature",
        step: 13,
        isActive: true,
      },
      {
        id: "step13_agree_esignature",
        label: "I agree to e-signature terms",
        fieldType: "CHECKBOX",
        context: "APPLICATION",
        configJson: null,
        isRequired: true,
        orderIndex: orderIdx++,
        section: "E-Signature",
        step: 13,
        isActive: true,
      }
    );

    // Use upsert for idempotency: each field has a deterministic ID
    const validFieldTypes = [
      "TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "DATE",
      "SELECT", "CHECKBOX", "FILE_UPLOAD", "HEADING", "PARAGRAPH",
    ];

    for (const field of defaultFields) {
      if (!validFieldTypes.includes(field.fieldType)) continue;

      await db.formField.upsert({
        where: { id: field.id },
        update: {},
        create: {
          id: field.id,
          label: field.label,
          fieldType: field.fieldType as Prisma.FormFieldType,
          context: "APPLICATION",
          configJson: field.configJson,
          isRequired: field.isRequired,
          orderIndex: field.orderIndex,
          section: field.section,
          step: field.step,
          isActive: true,
        },
      });
    }

    // Fetch all created fields
    const created = await db.formField.findMany({
      where: { context: "APPLICATION", isActive: true },
      orderBy: [{ orderIndex: "asc" }],
    });

    const parsed = created.map((f) => ({
      ...f,
      configJson: f.configJson ? JSON.parse(f.configJson) : null,
    }));

    return NextResponse.json({
      message: `Successfully seeded ${parsed.length} default application fields.`,
      seeded: true,
      count: parsed.length,
      fields: parsed,
    });
  } catch (error) {
    console.error("Error seeding application fields:", error);
    return NextResponse.json(
      { error: "Failed to seed application fields" },
      { status: 500 }
    );
  }
}
