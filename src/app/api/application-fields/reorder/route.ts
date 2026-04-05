import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/application-fields/reorder — Reorder fields
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const userRole = (session.user as { role?: string }).role;

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

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.id || typeof item.orderIndex !== "number") {
        return NextResponse.json(
          { error: "Each item must have id and orderIndex" },
          { status: 400 }
        );
      }
    }

    await db.$transaction(
      items.map((item: { id: string; orderIndex: number }) =>
        db.formField.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );

    return NextResponse.json({ success: true, updated: items.length });
  } catch (error) {
    console.error("Error reordering application fields:", error);
    return NextResponse.json(
      { error: "Failed to reorder application fields" },
      { status: 500 }
    );
  }
}
