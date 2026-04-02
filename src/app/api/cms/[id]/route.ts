import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/cms/[id] - Get CMS content detail
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
    const content = await db.cMSContent.findUnique({
      where: { id },
    });

    if (!content) {
      return NextResponse.json(
        { error: "CMS content not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error("Error fetching CMS content:", error);
    return NextResponse.json(
      { error: "Failed to fetch CMS content" },
      { status: 500 }
    );
  }
}

// PUT /api/cms/[id] - Update CMS content (SUPER_ADMIN only)
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
        { error: "Only Super Admin can update CMS content" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.cMSContent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "CMS content not found" },
        { status: 404 }
      );
    }

    const updated = await db.cMSContent.update({
      where: { id },
      data: {
        ...(body.page !== undefined && { page: body.page }),
        ...(body.section !== undefined && { section: body.section || null }),
        ...(body.title !== undefined && { title: body.title || null }),
        ...(body.content !== undefined && { content: body.content || null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
        ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl || null }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating CMS content:", error);
    return NextResponse.json(
      { error: "Failed to update CMS content" },
      { status: 500 }
    );
  }
}

// DELETE /api/cms/[id] - Soft delete (SUPER_ADMIN only)
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
        { error: "Only Super Admin can delete CMS content" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.cMSContent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "CMS content not found" },
        { status: 404 }
      );
    }

    const deleted = await db.cMSContent.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Error deleting CMS content:", error);
    return NextResponse.json(
      { error: "Failed to delete CMS content" },
      { status: 500 }
    );
  }
}
