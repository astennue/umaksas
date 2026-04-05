/**
 * Migration script: Fix Officer accounts
 * 
 * This script does two things:
 * 1. Sets all OFFICER users to isActive: true
 * 2. Creates SAProfile records for OFFICER users who don't have one
 * 
 * Run with: npx tsx scripts/fix-officers.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("=== Officer Fix Migration ===\n");

  // Step 1: Count current state
  const totalOfficers = await db.user.count({ where: { role: "OFFICER" } });
  const inactiveOfficers = await db.user.count({
    where: { role: "OFFICER", isActive: false },
  });

  const officersWithProfile = await db.user.count({
    where: { role: "OFFICER", profile: { isNot: null } },
  });

  const officersWithoutProfile = totalOfficers - officersWithProfile;

  console.log(`Total Officers: ${totalOfficers}`);
  console.log(`Inactive Officers: ${inactiveOfficers}`);
  console.log(`Officers with SAProfile: ${officersWithProfile}`);
  console.log(`Officers without SAProfile: ${officersWithoutProfile}`);
  console.log();

  if (inactiveOfficers === 0 && officersWithoutProfile === 0) {
    console.log("✓ All Officers are already active and have SAProfiles. Nothing to do.");
    return;
  }

  // Step 2: Activate all inactive Officers
  if (inactiveOfficers > 0) {
    console.log(`Activating ${inactiveOfficers} inactive Officer accounts...`);
    const result = await db.user.updateMany({
      where: { role: "OFFICER", isActive: false },
      data: { isActive: true },
    });
    console.log(`✓ Activated ${result.count} Officer accounts`);
  }

  // Step 3: Create SAProfile for Officers missing one
  if (officersWithoutProfile > 0) {
    console.log(`\nCreating SAProfiles for ${officersWithoutProfile} Officers...`);
    const officers = await db.user.findMany({
      where: {
        role: "OFFICER",
        isActive: true,
        profile: null,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    let created = 0;
    for (const officer of officers) {
      try {
        await db.sAProfile.create({
          data: {
            userId: officer.id,
            status: "ACTIVE",
          },
        });
        created++;
        console.log(`  ✓ Created SAProfile for ${officer.email} (${officer.firstName} ${officer.lastName})`);
      } catch (err) {
        console.error(`  ✗ Failed to create SAProfile for ${officer.email}:`, err);
      }
    }
    console.log(`✓ Created ${created}/${officers.length} SAProfiles`);
  }

  // Verify results
  const finalInactive = await db.user.count({
    where: { role: "OFFICER", isActive: false },
  });
  const finalWithoutProfile = totalOfficers - (await db.user.count({
    where: { role: "OFFICER", profile: { isNot: null } },
  }));

  console.log("\n=== Final State ===");
  console.log(`Inactive Officers: ${finalInactive}`);
  console.log(`Officers without SAProfile: ${finalWithoutProfile}`);

  if (finalInactive === 0 && finalWithoutProfile === 0) {
    console.log("\n✓ Migration complete! All Officers are active and have SAProfiles.");
  } else {
    console.log("\n⚠ Some issues remain. Check the errors above.");
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
