import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/cms - List CMS content with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "";
    const isActive = searchParams.get("isActive");
    const limitParam = searchParams.get("limit") || "50";
    const offsetParam = searchParams.get("offset") || "0";

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    const where: Record<string, unknown> = {};

    if (page) {
      where["page"] = page;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where["isActive"] = isActive === "true";
    }

    const [contents, total] = await Promise.all([
      db.cMSContent.findMany({
        where,
        orderBy: [{ page: "asc" }, { order: "asc" }],
        skip: offset,
        take: limit,
      }),
      db.cMSContent.count({ where }),
    ]);

    return NextResponse.json({
      contents,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching CMS content:", error);
    return NextResponse.json(
      { error: "Failed to fetch CMS content" },
      { status: 500 }
    );
  }
}

// POST /api/cms - Create CMS content (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can create CMS content" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      page,
      section,
      title,
      content,
      imageUrl,
      videoUrl,
      order,
      isActive,
    } = body;

    if (!page) {
      return NextResponse.json(
        { error: "Page is required" },
        { status: 400 }
      );
    }

    const newContent = await db.cMSContent.create({
      data: {
        page,
        section: section || null,
        title: title || null,
        content: content || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        order: typeof order === "number" ? order : 0,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    console.error("Error creating CMS content:", error);
    return NextResponse.json(
      { error: "Failed to create CMS content" },
      { status: 500 }
    );
  }
}
