import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole, SAStatus } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

// Office code to full name mapping
const OFFICE_CODE_MAP: Record<string, string> = {
  CDPRM: "Center for Data Protection and Records Management",
  SOL: "Library Learning Commons – School of Law",
  CIGA: "Center for International and Global Affairs",
  SPMO: "Supply and Property Management Office",
  OVPPR: "Office of the VP for Planning and Research",
  IDEM: "Institute for Disaster and Emergency Management",
  UFMO: "University Facilities Management Office",
  CLP: "Center for Linkages and Placement",
  CASH: "Cash Office",
  OUR: "Office of the University Registrar",
  IIHS: "Institute of Imaging Health Sciences",
  OVPAA: "Office of the VP for Academic Affairs",
  LLC: "Library Learning Commons",
  ULLC: "University Library Learning Commons",
  IAD: "Institute of Arts and Design",
  OVPSSCD: "Office of the VP for Student Services and Community Development",
  MDO: "Medical and Dental Office",
  HRMO: "Human Resource Management Office",
  CFD: "Center for Planning and Development",
  CCIS: "College of Computing and Information Sciences",
  AO: "Accounting Office",
  CSFD: "Center for Student Formation and Discipline",
  GSO: "General Services Office",
  CBFS: "College of Business and Financial Sciences",
  ITEST: "Institute of Technical Education and Skills Training",
  CTHM: "College of Tourism and Hospitality Management",
  CTBL: "Center for Technology-Based Learning",
  CAS: "Center for Admission and Scholarship",
  CQMD: "Center for Quality Management and Development",
  CLAS: "College of Liberal Arts and Sciences",
  CET: "College of Engineering Technology",
  CUR: "Center for University Research",
  ISW: "Institute of Social Work",
  CTIED: "Center for Technology Incubation and Enterprise Development",
  CGCS: "Center for Guidance and Counseling Services",
  OUP: "Office of the University President",
  UMREC: "UMak Research and Extension Center",
  CIT: "Center for Information Technology",
  CCED: "Center for Community Extension and Development",
  CSOA: "Center for Student Organizations and Activities",
  CIC: "Center for Information and Communications",
  IMC: "Information and Communications Office",
};

// POST /api/student-assistants/import - Import from Excel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (!["SUPER_ADMIN", "ADVISER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only Super Admin or Adviser can import student assistants" },
        { status: 403 }
      );
    }

    // Read the Excel file
    const filePath = path.join(
      process.cwd(),
      "upload",
      "Student Assistant – Data Collection Form (Responses).xlsx"
    );

    let fileBuffer: Buffer;
    try {
      fileBuffer = readFileSync(filePath);
    } catch {
      return NextResponse.json(
        { error: "Excel file not found. Please ensure the file exists in the upload directory." },
        { status: 400 }
      );
    }

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    let created = 0;
    let skipped = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Excel rows are 1-indexed, row 1 is header

      try {
        // Extract fields (handle trailing spaces in column names)
        const assignedOfficeRaw = String(row["Assigned Office  "] || row["Assigned Office"] || "").trim();
        const studentNumber = String(row["Student Number"] || "").trim();
        const fullName = String(row["Full name (LN, FN, MI)"] || "").trim();
        const dateOfBirth = row["Date of Birth"] ? String(row["Date of Birth"]).trim() : "";
        const age = row["Age"] ? parseInt(String(row["Age"]), 10) : null;
        const sex = row["Sex"] ? String(row["Sex"]).trim() : "";
        const courtesyTitle = row["Courtesy Title"] ? String(row["Courtesy Title"]).trim() : "";
        const college = row["College"] ? String(row["College"]).trim() : "";
        const program = row["Program"] ? String(row["Program"]).trim() : "";
        const umakEmail = String(row["UMak Email"] || "").trim();
        const contactNumber = row["Contact Number"] ? String(row["Contact Number"]).trim() : "";
        const personalEmail = row["Personal Email"] ? String(row["Personal Email"]).trim() : "";

        // Skip rows without essential data
        if (!fullName || !umakEmail) {
          skipped++;
          errors.push({ row: rowNumber, error: "Missing name or email" });
          continue;
        }

        // Parse the name: "LastName, FirstName MiddleInitial."
        const { firstName, lastName, middleName } = parseFullName(fullName);
        if (!firstName || !lastName) {
          skipped++;
          errors.push({ row: rowNumber, error: `Could not parse name: "${fullName}"` });
          continue;
        }

        // Check if user already exists (skip duplicates)
        const existingUser = await db.user.findUnique({
          where: { email: umakEmail.toLowerCase() },
        });
        if (existingUser) {
          skipped++;
          continue;
        }

        // Clean office code (take first word/token before space)
        const officeCode = assignedOfficeRaw.split(/\s+/)[0].toUpperCase();
        const officeName = OFFICE_CODE_MAP[officeCode] || assignedOfficeRaw;

        // Find or create the office
        let office = await db.office.findFirst({
          where: {
            OR: [
              { code: officeCode },
              { name: officeName },
            ],
          },
        });

        if (!office) {
          office = await db.office.create({
            data: {
              name: officeName,
              code: officeCode,
            },
          });
        }

        // Parse date of birth
        let dob: Date | null = null;
        if (dateOfBirth) {
          try {
            // Try parsing the date - Excel dates can be serial numbers or strings
            const parsedDate = XLSX.SSF.parse_date_code(Number(dateOfBirth) || new Date(dateOfBirth).getTime());
            if (parsedDate) {
              dob = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
            }
          } catch {
            // Try standard date parsing
            const tryDate = new Date(dateOfBirth);
            if (!isNaN(tryDate.getTime())) {
              dob = tryDate;
            }
          }
        }

        // Create the user with STUDENT_ASSISTANT role
        const newUser = await db.user.create({
          data: {
            email: umakEmail.toLowerCase(),
            password: `UMAKSA@${lastName}_2026`,
            firstName,
            lastName,
            middleName: middleName || null,
            phone: contactNumber || null,
            role: UserRole.STUDENT_ASSISTANT,
            isActive: true,
            profile: {
              create: {
                studentNumber: studentNumber || null,
                college: college || null,
                program: program || null,
                officeId: office.id,
                status: SAStatus.ACTIVE,
                dateOfBirth: dob,
                age: age || null,
                sex: sex || null,
                courtesyTitle: courtesyTitle || null,
                contactNumber: contactNumber || null,
                personalEmail: personalEmail || null,
              },
            },
          },
        });

        // Create notification preferences
        await db.notificationPreference.create({
          data: { userId: newUser.id },
        });

        created++;
      } catch (error: unknown) {
        skipped++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({ row: rowNumber, error: errorMessage });
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      created,
      skipped,
      errors: errors.slice(0, 50), // Limit error details to first 50
      message: `Import completed: ${created} created, ${skipped} skipped out of ${rows.length} rows.`,
    });
  } catch (error) {
    console.error("Error importing student assistants:", error);
    return NextResponse.json(
      { error: "Failed to import student assistants" },
      { status: 500 }
    );
  }
}

/**
 * Parse name from format "LastName, FirstName MiddleInitial."
 * Examples:
 *   "Dela Cruz, Juan A." -> { firstName: "Juan", lastName: "Dela Cruz", middleName: "A." }
 *   "Santos, Maria" -> { firstName: "Maria", lastName: "Santos", middleName: "" }
 *   "Reyes, Pedro Miguel Jr." -> { firstName: "Pedro Miguel", lastName: "Reyes", middleName: "Jr." }
 */
function parseFullName(fullName: string): {
  firstName: string;
  lastName: string;
  middleName: string;
} {
  // Split by comma first
  const commaParts = fullName.split(",");
  if (commaParts.length < 2) {
    // No comma - try splitting by space and treat first word as last name
    const spaceParts = fullName.trim().split(/\s+/);
    if (spaceParts.length < 2) {
      return { firstName: fullName.trim(), lastName: "", middleName: "" };
    }
    return {
      firstName: spaceParts.slice(1).join(" "),
      lastName: spaceParts[0],
      middleName: "",
    };
  }

  const lastName = commaParts[0].trim();
  const rest = commaParts.slice(1).join(",").trim(); // In case there's an extra comma
  const nameParts = rest.split(/\s+/);

  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName, middleName: "" };
  }

  // If the last part ends with ".", treat it as middle initial/name
  const lastPart = nameParts[nameParts.length - 1];
  if (lastPart.endsWith(".")) {
    return {
      firstName: nameParts.slice(0, -1).join(" "),
      lastName,
      middleName: lastPart,
    };
  }

  // Otherwise, everything after first name is the middle name
  return {
    firstName: nameParts[0],
    lastName,
    middleName: nameParts.slice(1).join(" "),
  };
}
