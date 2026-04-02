import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      // Return current user's officer profile
      const currentUserId = (session.user as { id?: string })?.id;
      const profile = await db.officerProfile.findUnique({
        where: { userId: currentUserId! },
      });
      if (!profile) {
        return NextResponse.json({ error: "No officer profile found" }, { status: 404 });
      }
      return NextResponse.json({ position: profile.position });
    }

    const profile = await db.officerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return NextResponse.json({ error: "No officer profile found" }, { status: 404 });
    }

    return NextResponse.json({ position: profile.position });
  } catch (error) {
    console.error("Error fetching officer profile:", error);
    return NextResponse.json({ error: "Failed to fetch officer profile" }, { status: 500 });
  }
}
