import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications?unread=true&limit=10&offset=0
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string };
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          link: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, type, title, message, link } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title, message" },
        { status: 400 }
      );
    }

    // Check notification preferences
    const preferenceField = notificationTypeToPreferenceField(type);
    if (preferenceField) {
      const prefs = await db.notificationPreference.findUnique({
        where: { userId },
        select: { id: true, [preferenceField]: true },
      });

      if (prefs && !(prefs as Record<string, unknown>)[preferenceField]) {
        // User has disabled this notification type
        return NextResponse.json({ skipped: true, reason: "Notification type disabled in preferences" });
      }
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

function notificationTypeToPreferenceField(type: string): string | null {
  const mapping: Record<string, string> = {
    APPLICATION_SUBMITTED: "applicationSubmitted",
    APPLICATION_APPROVED: "applicationApproved",
    APPLICATION_REJECTED: "applicationRejected",
    INTERVIEW_SCHEDULED: "interviewScheduled",
    INTERVIEW_REMINDER: "interviewReminder",
    EVALUATION_DUE: "evaluationDue",
    EVALUATION_SUBMITTED: "evaluationSubmitted",
    PAYMENT_DUE: "paymentDue",
    PAYMENT_VERIFIED: "paymentVerified",
    EVENT_ASSIGNED: "eventAssigned",
    EVENT_REMINDER: "eventReminder",
    SCHEDULE_APPROVED: "scheduleApproved",
    ATTENDANCE_CORRECTED: "attendanceCorrected",
    ACCOUNT_CREATED: "accountCreated",
    SYSTEM: "system",
  };
  return mapping[type] || null;
}
