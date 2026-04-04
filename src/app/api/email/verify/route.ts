import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTestEmail, sendNotificationEmail } from "@/lib/email";

// GET /api/email/verify - Verify SMTP connection by sending a test email
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only authorized roles can verify email configuration" },
        { status: 403 }
      );
    }

    const result = await sendTestEmail();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "SMTP connection verified. Test email sent successfully.",
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "SMTP connection failed",
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify email configuration" },
      { status: 500 }
    );
  }
}

// POST /api/email/verify - Send a notification email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["SUPER_ADMIN", "ADVISER", "OFFICER"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only authorized roles can send emails" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "to, subject, and message are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const result = await sendNotificationEmail(to, subject, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send email",
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
