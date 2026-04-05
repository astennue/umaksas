import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to check authorization for mutations
async function checkAuth(): Promise<
  | { authorized: true }
  | NextResponse
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  const userRole = (session.user as { role?: string }).role;

  if (userRole === "SUPER_ADMIN" || userRole === "ADVISER") {
    return { authorized: true };
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
    return { authorized: true };
  } else {
    return NextResponse.json(
      { error: "Forbidden. Only SUPER_ADMIN, ADVISER, or SAS President can manage application fields." },
      { status: 403 }
    );
  }
}

const VALID_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "DATE", "SELECT", "CHECKBOX", "FILE_UPLOAD", "HEADING", "PARAGRAPH"];

// PUT /api/application-fields/[id] — Update an existing field
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.formField.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Form field not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.label !== undefined) updateData.label = body.label;
    if (body.fieldType !== undefined) {
      if (!VALID_TYPES.includes(body.fieldType)) {
        return NextResponse.json({ error: "Invalid fieldType" }, { status: 400 });
      }
      updateData.fieldType = body.fieldType;
    }
    if (body.configJson !== undefined) {
      updateData.configJson = body.configJson ? JSON.stringify(body.configJson) : null;
    }
    if (body.isRequired !== undefined) updateData.isRequired = body.isRequired;
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
    if (body.section !== undefined) updateData.section = body.section || null;
    if (body.step !== undefined) updateData.step = body.step;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await db.formField.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      configJson: updated.configJson ? JSON.parse(updated.configJson) : null,
    });
  } catch (error) {
    console.error("Error updating application field:", error);
    return NextResponse.json(
      { error: "Failed to update application field" },
      { status: 500 }
    );
  }
}

// DELETE /api/application-fields/[id] — Delete a field
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuth();
    if (!auth.authorized) return auth;

    const { id } = await params;
    const existing = await db.formField.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Form field not found" },
        { status: 404 }
      );
    }

    await db.formField.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting application field:", error);
    return NextResponse.json(
      { error: "Failed to delete application field" },
      { status: 500 }
    );
  }
}
