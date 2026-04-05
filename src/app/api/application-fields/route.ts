import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/application-fields — Return all fields where context='APPLICATION', ordered by orderIndex
export async function GET() {
  try {
    const fields = await db.formField.findMany({
      where: { context: "APPLICATION", isActive: true },
      orderBy: [{ orderIndex: "asc" }],
    });

    // Parse configJson for each field
    const parsed = fields.map((f) => ({
      ...f,
      configJson: f.configJson ? JSON.parse(f.configJson) : null,
    }));

    return NextResponse.json({ fields: parsed });
  } catch (error) {
    console.error("Error fetching application fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch application fields" },
      { status: 500 }
    );
  }
}

// POST /api/application-fields — Create a new field
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const userRole = (session.user as { role?: string }).role;

    // Auth: SUPER_ADMIN, ADVISER, or OFFICER (PRESIDENT position only)
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
    const { label, fieldType, configJson, isRequired, orderIndex, section, step } = body;

    if (!label || !fieldType) {
      return NextResponse.json(
        { error: "label and fieldType are required" },
        { status: 400 }
      );
    }

    const validTypes = ["TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "DATE", "SELECT", "CHECKBOX", "FILE_UPLOAD", "HEADING", "PARAGRAPH"];
    if (!validTypes.includes(fieldType)) {
      return NextResponse.json(
        { error: `Invalid fieldType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const field = await db.formField.create({
      data: {
        label,
        fieldType,
        context: "APPLICATION",
        configJson: configJson ? JSON.stringify(configJson) : null,
        isRequired: typeof isRequired === "boolean" ? isRequired : false,
        orderIndex: typeof orderIndex === "number" ? orderIndex : 0,
        section: section || null,
        step: typeof step === "number" ? step : null,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        ...field,
        configJson: field.configJson ? JSON.parse(field.configJson) : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating application field:", error);
    return NextResponse.json(
      { error: "Failed to create application field" },
      { status: 500 }
    );
  }
}
