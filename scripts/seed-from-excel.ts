// Seed script that reads directly from the Excel file
// Usage: DATABASE_URL="..." bun scripts/seed-from-excel.ts
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import { readFileSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL env var required");
  process.exit(1);
}

const db = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

// ============================================
// OFFICER EMAILS (these get OFFICER role + OfficerProfile)
// ============================================
const OFFICER_EMAILS = new Set([
  "rnuevas.k12042427@umak.edu.ph",
  "jpelovello.a12344479@umak.edu.ph",
  "acerilla.k12151773@umak.edu.ph",
  "nclavo.k12255841@umak.edu.ph",
  "jdingle.a12343741@umak.edu.ph",
  "mcruz.k12148911@umak.edu.ph",
  "dmartinez.a12343893@umak.edu.ph",
]);

const OFFICER_POSITIONS: Record<string, { position: string; order: number }> = {
  "rnuevas.k12042427@umak.edu.ph": { position: "PRESIDENT", order: 1 },
  "jpelovello.a12344479@umak.edu.ph": { position: "VICE_PRESIDENT_INTERNAL", order: 2 },
  "acerilla.k12151773@umak.edu.ph": { position: "VICE_PRESIDENT_EXTERNAL", order: 3 },
  "nclavo.k12255841@umak.edu.ph": { position: "SECRETARY", order: 4 },
  "jdingle.a12343741@umak.edu.ph": { position: "TREASURER", order: 5 },
  "mcruz.k12148911@umak.edu.ph": { position: "AUDITOR", order: 6 },
  "dmartinez.a12343893@umak.edu.ph": { position: "PUBLIC_RELATION_OFFICER", order: 7 },
};

// ============================================
// OFFICE NAME MAPPING (Excel name → code + full name)
// ============================================
const OFFICE_MAP: Record<string, { code: string; name: string }> = {
  "CDPRM": { code: "CDPRM", name: "Center for Data Protection and Records Management" },
  "SOL library": { code: "SOL", name: "Library Learning Commons – School of Law" },
  "UMAK SOL OFFICE": { code: "SOL", name: "Library Learning Commons – School of Law" },
  "SOL": { code: "SOL", name: "Library Learning Commons" },
  "CIGA": { code: "CIGA", name: "Center for International and Global Affairs" },
  "SPMO": { code: "SPMO", name: "Supply and Property Management Office" },
  "OVPPR": { code: "OVPPR", name: "Office of the VP for Planning and Research" },
  "IDEM": { code: "IDEM", name: "Institute for Disaster and Emergency Management" },
  "UFMO": { code: "UFMO", name: "University Facilities Management Office" },
  "CLP": { code: "CLP", name: "Center for Linkages and Placement" },
  "Cash office": { code: "CASH", name: "Cash Office" },
  "CASH": { code: "CASH", name: "Cash Office" },
  "Office of the University Registrar": { code: "OUR", name: "Office of the University Registrar" },
  "OUR": { code: "OUR", name: "Office of the University Registrar" },
  "IIHS": { code: "IIHS", name: "Institute of Imaging Health Sciences" },
  "OVPAA": { code: "OVPAA", name: "Office of the VP for Academic Affairs" },
  "LLC": { code: "LLC", name: "Library Learning Commons" },
  "ULLC": { code: "ULLC", name: "University Library Learning Commons" },
  "IAD Office": { code: "IAD", name: "Institute of Arts and Design" },
  "IAD": { code: "IAD", name: "Institute of Arts and Design" },
  "OVPSSCD": { code: "OVPSSCD", name: "Office of the VP for Student Services and Community Development" },
  "MDO": { code: "MDO", name: "Medical and Dental Office" },
  "Medical and Dental Office (MDO)": { code: "MDO", name: "Medical and Dental Office" },
  "HRMO": { code: "HRMO", name: "Human Resource Management Office" },
  "CFD": { code: "CFD", name: "Center for Planning and Development" },
  "CCIS OFFICE": { code: "CCIS", name: "College of Computing and Information Sciences" },
  "CCIS": { code: "CCIS", name: "College of Computing and Information Sciences" },
  "ACCOUNTING OFFICE (AO)": { code: "AO", name: "Accounting Office" },
  "AO": { code: "AO", name: "Accounting Office" },
  "CSFD": { code: "CSFD", name: "Center for Student Formation and Discipline" },
  "Center for Student Formation and Discipline": { code: "CSFD", name: "Center for Student Formation and Discipline" },
  "GSO": { code: "GSO", name: "General Services Office" },
  "CBFS": { code: "CBFS", name: "College of Business and Financial Sciences" },
  "ITEST": { code: "ITEST", name: "Institute for Technical Education and Skills Training" },
  "CTHM": { code: "CTHM", name: "College of Tourism and Hospitality Management" },
  "Center for Admission and Scholarship": { code: "CAS", name: "Center for Admission and Scholarship" },
  "CAS": { code: "CAS", name: "Center for Admission and Scholarship" },
  "CQMD": { code: "CQMD", name: "Center for Quality Management and Development" },
  "CLAS": { code: "CLAS", name: "College of Liberal Arts and Sciences" },
  "CET": { code: "CET", name: "College of Engineering Technology" },
  "CUR": { code: "CUR", name: "Center for University Research" },
  "ISW": { code: "ISW", name: "Institute of Social Work" },
  "Office of the University President (OUP)": { code: "OUP", name: "Office of the University President" },
  "OUP": { code: "OUP", name: "Office of the University President" },
  "UMREC": { code: "UMREC", name: "UMak Research and Extension Center" },
  "CTBL": { code: "CTBL", name: "Center for Technology-Based Learning" },
  "CTIED": { code: "CTIED", name: "Center for Technology Incubation and Enterprise Development" },
  "CGCS": { code: "CGCS", name: "Center for Guidance and Counseling Services" },
  "IMC": { code: "IMC", name: "Information and Communications Office" },
  "CIC": { code: "CIC", name: "Center for Information and Communications" },
  "CIT": { code: "CIT", name: "Center for Information Technology" },
  "CCED": { code: "CCED", name: "Center for Community Extension and Development" },
  "CSOA": { code: "CSOA", name: "Center for Student Organizations and Activities" },
};

function parseName(fullName: string): { lastName: string; firstName: string; middleName?: string } {
  const cleaned = fullName.trim().replace(/\s+$/, "");
  const commaIdx = cleaned.indexOf(",");
  if (commaIdx === -1) {
    const words = cleaned.split(/\s+/);
    return { lastName: words[words.length - 1] || cleaned, firstName: words[0] || "", middleName: words.length > 2 ? words.slice(1, -1).join(" ") : undefined };
  }
  const lastName = cleaned.substring(0, commaIdx).trim();
  const rest = cleaned.substring(commaIdx + 1).trim();
  const nameWords = rest.split(/\s+/);
  return { lastName, firstName: nameWords[0] || "", middleName: nameWords.length > 1 ? nameWords.slice(1).join(" ") : undefined };
}

async function main() {
  console.log("🌱 Reading Excel file...");
  const filePath = path.resolve("upload/Student Assistant – Data Collection Form (Responses).xlsx");
  const fileBuffer = readFileSync(filePath);
  const wb = XLSX.read(fileBuffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
  console.log(`✅ Found ${rows.length} rows in Excel`);

  console.log("🌱 Connecting to Supabase...");
  await db.$connect();
  console.log("✅ Connected!");

  // ============================================
  // CLEANUP: Remove old SA/Officer/Supervisor data
  // Keep only SUPER_ADMIN, ADVISER, HRMO
  // ============================================
  console.log("\n🧹 Cleaning up old data...");

  // Get IDs of admin users to keep
  const adminUsers = await db.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADVISER", "HRMO"] } },
    select: { id: true },
  });
  const adminIds = adminUsers.map(u => u.id);
  console.log(`  Keeping ${adminIds.length} admin users`);

  // Get IDs of users to delete
  const usersToDelete = await db.user.findMany({
    where: { id: { not: { in: adminIds } } },
    select: { id: true },
  });
  const deleteIds = usersToDelete.map(u => u.id);
  console.log(`  Found ${deleteIds.length} users to delete`);

  // Delete dependent records first (reverse order of FK constraints)
  // Collection payments
  const cp1 = await db.collectionPayment.deleteMany({ where: { userId: { in: deleteIds } } });
  console.log(`  Deleted ${cp1.count} collection payments`);

  // Payment collections created by these users
  const pc1 = await db.paymentCollection.deleteMany({ where: { createdBy: { in: deleteIds } } });
  console.log(`  Deleted ${pc1.count} payment collections`);

  // Payments
  const p1 = await db.payment.deleteMany({ where: { userId: { in: deleteIds } } });
  console.log(`  Deleted ${p1.count} payments`);

  // SA profiles
  const deletedProfiles = await db.sAProfile.deleteMany({ where: { userId: { in: deleteIds } } });
  console.log(`  Deleted ${deletedProfiles.count} old SA profiles`);

  // Officer profiles
  const deletedOfficerProfiles = await db.officerProfile.deleteMany({ where: { userId: { in: deleteIds } } });
  console.log(`  Deleted ${deletedOfficerProfiles.count} old officer profiles`);

  // Unlink offices
  await db.office.updateMany({ where: { headUserId: { in: deleteIds } }, data: { headUserId: null } });

  // Update office IDs in remaining profiles to null
  await db.sAProfile.updateMany({ where: { officeId: { not: null } }, data: { officeId: null } });

  // Delete offices
  const deletedOffices = await db.office.deleteMany();
  console.log(`  Deleted ${deletedOffices.count} old offices`);

  // Now delete the users
  const deletedUsers = await db.user.deleteMany({ where: { id: { in: deleteIds } } });
  console.log(`  Deleted ${deletedUsers.count} users`);

  // ============================================
  // CREATE OFFICES from Excel data
  // ============================================
  console.log("\n📋 Creating Offices from Excel...");
  const officeIdByCode = new Map<string, string>();
  let officesCreated = 0;

  for (const row of rows) {
    const rawOffice = String(row["Assigned Office  "] || "").trim();
    if (!rawOffice) continue;

    const mapping = OFFICE_MAP[rawOffice];
    if (!mapping) {
      console.log(`  ⚠️ Unknown office: "${rawOffice}" — skipping`);
      continue;
    }

    if (officeIdByCode.has(mapping.code)) continue;

    try {
      const office = await db.office.create({
        data: {
          name: mapping.name,
          code: mapping.code,
          isActive: true,
        },
      });
      officeIdByCode.set(mapping.code, office.id);
      officesCreated++;
      console.log(`  ✅ ${mapping.code} — ${mapping.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ ${mapping.code}: ${msg}`);
    }
  }
  console.log(`  Total: ${officesCreated} offices`);

  // ============================================
  // CREATE USERS + PROFILES from Excel
  // ============================================
  console.log("\n📋 Creating Users from Excel...");
  let officerCount = 0;
  let saCount = 0;
  let profileCount = 0;
  let errors: string[] = [];

  for (const row of rows) {
    const email = String(row["UMak Email"] || "").trim().toLowerCase();
    if (!email) {
      errors.push("Row has no UMak Email");
      continue;
    }

    const fullName = String(row["Full name (LN, FN, MI)"] || "").trim();
    const { lastName, firstName, middleName } = parseName(fullName);
    const studentNumber = String(row["Student Number"] || "").trim();
    const college = String(row["College"] || "").trim();
    const program = String(row["Program"] || "").trim();
    const sex = String(row["Sex"] || "").trim();
    const courtesyTitle = String(row["Courtesy Title"] || "").trim();
    const contactNumber = String(row["Contact Number"] || "").trim();
    const personalEmail = String(row["Personal Email"] || "").trim();

    // Date of Birth (Excel serial number)
    let dateOfBirth: Date | undefined;
    const dobRaw = Number(row["Date of Birth"]);
    if (dobRaw && dobRaw > 30000 && dobRaw < 60000) {
      // Excel epoch: days since 1900-01-01 (with a bug: 1900-02-29 doesn't exist)
      const epoch = new Date(1899, 11, 30);
      dateOfBirth = new Date(epoch.getTime() + dobRaw * 86400000);
    }

    const age = Number(row["Age"]) || null;

    // Office assignment
    const rawOffice = String(row["Assigned Office  "] || "").trim();
    const officeMapping = OFFICE_MAP[rawOffice];
    const officeCode = officeMapping?.code || null;
    const officeId = officeCode ? officeIdByCode.get(officeCode) || null : null;

    // Determine role
    const isOfficer = OFFICER_EMAILS.has(email);
    const role = isOfficer ? "OFFICER" : "STUDENT_ASSISTANT";
    const password = `UMAKSAS_SA_${studentNumber}`;

    // Upsert user
    try {
      const user = await db.user.upsert({
        where: { email },
        update: {
          password,
          firstName,
          middleName: middleName || null,
          lastName,
          role,
          isActive: true,
          phone: contactNumber || null,
        },
        create: {
          email,
          password,
          firstName,
          middleName: middleName || null,
          lastName,
          role,
          isActive: true,
          phone: contactNumber || null,
        },
      });

      // Create SA Profile for EVERYONE (officers included)
      const existingProfile = await db.sAProfile.findUnique({ where: { userId: user.id } });
      if (!existingProfile) {
        await db.sAProfile.create({
          data: {
            userId: user.id,
            studentNumber: studentNumber || null,
            college: college || null,
            program: program || null,
            sex: sex || null,
            courtesyTitle: courtesyTitle || null,
            dateOfBirth: dateOfBirth || null,
            age: age,
            contactNumber: contactNumber || null,
            personalEmail: personalEmail || null,
            status: "ACTIVE",
            officeId,
          },
        });
        profileCount++;
      }

      // Create Officer Profile if officer
      if (isOfficer) {
        const posInfo = OFFICER_POSITIONS[email];
        const existingOP = await db.officerProfile.findUnique({ where: { userId: user.id } });
        if (!existingOP && posInfo) {
          await db.officerProfile.create({
            data: {
              userId: user.id,
              position: posInfo.position as "PRESIDENT" | "VICE_PRESIDENT_INTERNAL" | "VICE_PRESIDENT_EXTERNAL" | "SECRETARY" | "TREASURER" | "AUDITOR" | "PUBLIC_RELATION_OFFICER",
              orderIndex: posInfo.order,
            },
          });
        }
        officerCount++;
        console.log(`  ✅ ${email} (${posInfo?.position}) + SA profile`);
      } else {
        saCount++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${email}: ${msg}`);
      console.log(`  ❌ ${email}: ${msg}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  const finalUsers = await db.user.count();
  const finalOfficers = await db.user.count({ where: { role: "OFFICER" } });
  const finalSAs = await db.user.count({ where: { role: "STUDENT_ASSISTANT" } });
  const finalProfiles = await db.sAProfile.count();
  const finalOffices = await db.office.count();
  const finalOfficerProfiles = await db.officerProfile.count();

  console.log("\n" + "=".repeat(50));
  console.log("🎉 EXCEL SEED COMPLETE!");
  console.log("=".repeat(50));
  console.log(`  Officers (with SA profiles):  ${officerCount}`);
  console.log(`  Student Assistants:           ${saCount}`);
  console.log(`  SA Profiles created:          ${profileCount}`);
  console.log(`  Offices created:              ${finalOffices}`);
  console.log("─".repeat(50));
  console.log(`  Total users in DB:            ${finalUsers}`);
  console.log(`  Total officers in DB:         ${finalOfficers}`);
  console.log(`  Total SAs in DB:              ${finalSAs}`);
  console.log(`  Total SA profiles in DB:      ${finalProfiles}`);
  console.log(`  Total officer profiles in DB: ${finalOfficerProfiles}`);
  console.log(`  Total offices in DB:          ${finalOffices}`);
  if (errors.length > 0) {
    console.log(`\n  ⚠️ ${errors.length} errors:`);
    errors.forEach(e => console.log(`     - ${e}`));
  }
  console.log("=".repeat(50));
  console.log("\n🔑 Login Credentials:");
  console.log("   Email: superadmin@umak.edu.ph");
  console.log("   Pass: UMAKSAS@Super2025");
  console.log("=".repeat(50));

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ SEED FAILED:", e);
  await db.$disconnect();
  process.exit(1);
});
