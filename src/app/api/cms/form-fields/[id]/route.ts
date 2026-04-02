import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FormFieldType, FormContext } from "@prisma/client";

// GET /api/cms/form-fields/[id] - Get single form field
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const field = await db.formField.findUnique({ where: { id } });

    if (!field) {
      return NextResponse.json(
        { error: "Form field not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(field);
  } catch (error) {
    console.error("Error fetching form field:", error);
    return NextResponse.json(
      { error: "Failed to fetch form field" },
      { status: 500 }
    );
  }
}

// PUT /api/cms/form-fields/[id] - Update form field (SUPER_ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can update form fields" },
        { status: 403 }
      );
    }

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
      const validTypes = Object.values(FormFieldType);
      if (!validTypes.includes(body.fieldType)) {
        return NextResponse.json(
          { error: "Invalid fieldType" },
          { status: 400 }
        );
      }
      updateData.fieldType = body.fieldType;
    }
    if (body.context !== undefined) {
      const validContexts = Object.values(FormContext);
      if (!validContexts.includes(body.context)) {
        return NextResponse.json(
          { error: "Invalid context" },
          { status: 400 }
        );
      }
      updateData.context = body.context;
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating form field:", error);
    return NextResponse.json(
      { error: "Failed to update form field" },
      { status: 500 }
    );
  }
}

// DELETE /api/cms/form-fields/[id] - Delete form field (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can delete form fields" },
        { status: 403 }
      );
    }

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
    console.error("Error deleting form field:", error);
    return NextResponse.json(
      { error: "Failed to delete form field" },
      { status: 500 }
    );
  }
}
