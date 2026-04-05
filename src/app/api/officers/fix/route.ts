import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole, SAStatus } from "@prisma/client";

// POST /api/officers/fix — Activate all Officer accounts and create SAProfiles
export async function POST() {
  try {
    let activatedCount = 0;
    let profilesCreated = 0;
    const errors: string[] = [];

    const inactiveOfficers = await db.user.findMany({
      where: { role: UserRole.OFFICER, isActive: false },
      select: { id: true, email: true },
    });

    if (inactiveOfficers.length > 0) {
      const activatedUsers = await db.user.updateMany({
        where: { role: UserRole.OFFICER, isActive: false },
        data: { isActive: true },
      });
      activatedCount = activatedUsers.count;

      await db.activityLog.createMany({
        data: inactiveOfficers.map((o) => ({
          userId: o.id,
          action: "OFFICER_ACCOUNT_ACTIVATED",
          entityType: "User",
          entityId: o.id,
          details: "Account activated via Officer Fix tool",
        })),
      });
    }

    const officersWithoutProfile = await db.user.findMany({
      where: { role: UserRole.OFFICER, isActive: true, profile: null },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    for (const officer of officersWithoutProfile) {
      try {
        await db.sAProfile.create({
          data: { userId: officer.id, status: SAStatus.ACTIVE },
        });
        profilesCreated++;
        await db.activityLog.create({
          userId: officer.id,
          action: "SA_PROFILE_CREATED",
          entityType: "SAProfile",
          entityId: officer.id,
          details: "SAProfile auto-created via Officer Fix tool",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed for ${officer.email}: ${msg}`);
      }
    }

    return NextResponse.json({ success: true, activatedCount, profilesCreated, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fix officer accounts" }, { status: 500 });
  }
}

// GET /api/officers/fix — Preview (no auth required for setup)
export async function GET() {
  try {
    const inactiveOfficers = await db.user.findMany({
      where: { role: UserRole.OFFICER, isActive: false },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const officersWithoutProfile = await db.user.findMany({
      where: { role: UserRole.OFFICER, isActive: true, profile: null },
      select: { id: true, email: true, firstName: true, lastName: true, officerProfile: { select: { position: true } } },
    });
    const totalOfficers = await db.user.count({ where: { role: UserRole.OFFICER } });
    const officersWithProfile = await db.user.count({ where: { role: UserRole.OFFICER, isActive: true, profile: { isNot: null } } });

    return NextResponse.json({
      totalOfficers,
      activeOfficers: totalOfficers - inactiveOfficers.length,
      inactiveOfficers: inactiveOfficers.length,
      inactiveOfficerList: inactiveOfficers,
      officersWithoutProfile: officersWithoutProfile.length,
      officerWithoutProfileList: officersWithoutProfile,
      officersWithProfile,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to preview" }, { status: 500 });
  }
}
