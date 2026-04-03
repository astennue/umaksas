import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const announcements = await db.announcement.findMany({
      where: {
        isPublished: true,
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
      take: 5,
    });

    // Fetch author names
    const authorIds = [...new Set(announcements.map((a) => a.authorId).filter(Boolean) as string[])];
    const authorMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const authors = await db.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      for (const author of authors) {
        authorMap.set(
          author.id,
          `${author.firstName || ""} ${author.lastName || ""}`.trim() || "Unknown"
        );
      }
    }

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        excerpt: a.excerpt,
        imageUrl: a.imageUrl,
        priority: a.priority,
        isPinned: a.isPinned,
        publishedAt: a.publishedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        author: a.authorId ? (authorMap.get(a.authorId) || "Unknown") : "Unknown",
      })),
    });
  } catch (error) {
    console.error("Error fetching public announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}
