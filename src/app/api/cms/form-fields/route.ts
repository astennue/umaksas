import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FormContext, FormFieldType } from "@prisma/client";

// GET /api/cms/form-fields - List form fields with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const context = searchParams.get("context") || "";
    const section = searchParams.get("section") || "";
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (context) {
      where["context"] = context as FormContext;
    }

    if (section) {
      where["section"] = section;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where["isActive"] = isActive === "true";
    }

    const fields = await db.formField.findMany({
      where,
      orderBy: [{ orderIndex: "asc" }],
    });

    return NextResponse.json({ fields });
  } catch (error) {
    console.error("Error fetching form fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch form fields" },
      { status: 500 }
    );
  }
}

// POST /api/cms/form-fields - Create form field (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can create form fields" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      label,
      fieldType,
      context,
      configJson,
      isRequired,
      orderIndex,
      section,
      step,
    } = body;

    if (!label || !fieldType || !context) {
      return NextResponse.json(
        { error: "label, fieldType, and context are required" },
        { status: 400 }
      );
    }

    const validTypes = Object.values(FormFieldType);
    if (!validTypes.includes(fieldType)) {
      return NextResponse.json(
        { error: `Invalid fieldType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const validContexts = Object.values(FormContext);
    if (!validContexts.includes(context)) {
      return NextResponse.json(
        { error: `Invalid context. Must be one of: ${validContexts.join(", ")}` },
        { status: 400 }
      );
    }

    const field = await db.formField.create({
      data: {
        label,
        fieldType: fieldType as FormFieldType,
        context: context as FormContext,
        configJson: configJson ? JSON.stringify(configJson) : null,
        isRequired: typeof isRequired === "boolean" ? isRequired : false,
        orderIndex: typeof orderIndex === "number" ? orderIndex : 0,
        section: section || null,
        step: typeof step === "number" ? step : null,
        isActive: true,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error("Error creating form field:", error);
    return NextResponse.json(
      { error: "Failed to create form field" },
      { status: 500 }
    );
  }
}
