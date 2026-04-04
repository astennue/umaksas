import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [saCount, officeCount, collegeSet] = await Promise.all([
      db.user.count({ where: { role: "STUDENT_ASSISTANT", isActive: true } }),
      db.office.count({ where: { isActive: true } }),
      db.sAProfile.groupBy({ by: ["college"], where: { status: "ACTIVE" } }),
    ]);

    return NextResponse.json({
      saCount,
      officeCount,
      collegeCount: collegeSet.length,
    });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    return NextResponse.json({ saCount: 0, officeCount: 0, collegeCount: 0 });
  }
}
