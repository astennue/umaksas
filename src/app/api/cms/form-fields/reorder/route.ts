import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/cms/form-fields/reorder - Reorder form fields (SUPER_ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can reorder form fields" },
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

    // Validate each item
    for (const item of items) {
      if (!item.id || typeof item.orderIndex !== "number") {
        return NextResponse.json(
          { error: "Each item must have id and orderIndex" },
          { status: 400 }
        );
      }
    }

    // Update all in a transaction
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
    console.error("Error reordering form fields:", error);
    return NextResponse.json(
      { error: "Failed to reorder form fields" },
      { status: 500 }
    );
  }
}
