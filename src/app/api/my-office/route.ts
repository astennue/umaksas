import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET /api/my-office - Returns the office headed by the current OFFICE_SUPERVISOR
export async function GET() {
  try {
    const authResult = await requireRole([UserRole.OFFICE_SUPERVISOR]);
    if (authResult instanceof NextResponse) return authResult;

    const { user } = authResult;

    const office = await db.office.findFirst({
      where: { headUserId: user.id, isActive: true },
      select: { id: true, name: true, code: true },
    });

    if (!office) {
      return NextResponse.json(
        { error: "No office assigned to this supervisor" },
        { status: 404 }
      );
    }

    return NextResponse.json(office);
  } catch (error) {
    console.error("Error fetching supervisor office:", error);
    return NextResponse.json(
      { error: "Failed to fetch office information" },
      { status: 500 }
    );
  }
}
