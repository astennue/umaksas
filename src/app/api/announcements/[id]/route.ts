import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADVISER", "OFFICER"];

async function getAuthorName(authorId: string | null): Promise<string> {
  if (!authorId) return "Unknown";
  try {
    const user = await db.user.findUnique({
      where: { id: authorId },
      select: { firstName: true, lastName: true },
    });
    if (!user) return "Unknown";
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
  } catch {
    return "Unknown";
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const announcement = await db.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    // Non-auth users can only see published announcements
    if (!announcement.isPublished) {
      const session = await getServerSession(authOptions);
      const isAdmin = session && ADMIN_ROLES.includes((session.user as { role: string }).role);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Announcement not found" },
          { status: 404 }
        );
      }
    }

    const authorName = await getAuthorName(announcement.authorId);

    return NextResponse.json({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      excerpt: announcement.excerpt,
      imageUrl: announcement.imageUrl,
      priority: announcement.priority,
      isPublished: announcement.isPublished,
      isPinned: announcement.isPinned,
      publishedAt: announcement.publishedAt,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      author: authorName,
      visibility: announcement.visibility,
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes((session.user as { role: string }).role)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, excerpt, priority, imageUrl, isPublished, isPinned, visibility } = body;

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    // Handle publish state transitions
    let publishedAt = existing.publishedAt;
    if (isPublished && !existing.isPublished) {
      publishedAt = new Date();
    } else if (!isPublished && existing.isPublished) {
      publishedAt = null;
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(excerpt !== undefined && { excerpt: excerpt || null }),
        ...(priority !== undefined && { priority }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(isPublished !== undefined && { isPublished, publishedAt }),
        ...(isPinned !== undefined && { isPinned }),
        ...(visibility !== undefined && { visibility }),
      },
    });

    const authorName = await getAuthorName(announcement.authorId);

    return NextResponse.json({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      excerpt: announcement.excerpt,
      imageUrl: announcement.imageUrl,
      priority: announcement.priority,
      isPublished: announcement.isPublished,
      isPinned: announcement.isPinned,
      publishedAt: announcement.publishedAt,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      author: authorName,
      visibility: announcement.visibility,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      { error: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role: string }).role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    await db.announcement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
