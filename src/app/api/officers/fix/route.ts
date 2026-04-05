import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { UserRole, SAStatus } from "@prisma/client";

// POST /api/officers/fix — Activate all Officer accounts and create SAProfiles for those missing one
// Only SUPER_ADMIN can run this
export async function POST() {
  try {
    const authResult = await requireRole(["SUPER_ADMIN"]);
    if (authResult instanceof NextResponse) return authResult;

    let activatedCount = 0;
    let profilesCreated = 0;
    const errors: string[] = [];

    // Step 1: Activate all inactive OFFICER users
    const activatedUsers = await db.user.updateMany({
      where: {
        role: UserRole.OFFICER,
        isActive: false,
      },
      data: {
        isActive: true,
      },
    });
    activatedCount = activatedUsers.count;

    // Step 2: Find all OFFICER users who don't have an SAProfile
    const officersWithoutProfile = await db.user.findMany({
      where: {
        role: UserRole.OFFICER,
        isActive: true,
        profile: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Step 3: Create SAProfile for each Officer missing one
    for (const officer of officersWithoutProfile) {
      try {
        await db.sAProfile.create({
          data: {
            userId: officer.id,
            status: SAStatus.ACTIVE,
          },
        });
        profilesCreated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to create SAProfile for ${officer.email}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Officer fix completed",
      activatedCount,
      profilesCreated,
      officersWithoutProfile: officersWithoutProfile.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in officer fix:", error);
    return NextResponse.json(
      { error: "Failed to fix officer accounts" },
      { status: 500 }
    );
  }
}

// GET /api/officers/fix — Preview what would be fixed (dry run)
export async function GET() {
  try {
    const authResult = await requireRole(["SUPER_ADMIN"]);
    if (authResult instanceof NextResponse) return authResult;

    // Count inactive officers
    const inactiveOfficers = await db.user.findMany({
      where: {
        role: UserRole.OFFICER,
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Count officers without SAProfile
    const officersWithoutProfile = await db.user.findMany({
      where: {
        role: UserRole.OFFICER,
        isActive: true,
        profile: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        officerProfile: {
          select: { position: true },
        },
      },
    });

    // Count total officers
    const totalOfficers = await db.user.count({
      where: { role: UserRole.OFFICER },
    });

    return NextResponse.json({
      totalOfficers,
      inactiveOfficers: inactiveOfficers.length,
      inactiveOfficerList: inactiveOfficers,
      officersWithoutProfile: officersWithoutProfile.length,
      officerWithoutProfileList: officersWithoutProfile,
    });
  } catch (error) {
    console.error("Error in officer fix preview:", error);
    return NextResponse.json(
      { error: "Failed to preview officer fix" },
      { status: 500 }
    );
  }
}
