import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/applications/[id]/signature — Save digital signature for an application
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // Session is optional — allow saving signatures without login

    const { id } = await params;
    const userId = session?.user ? (session.user as any).id : null;

    // Fetch the application
    const application = await db.application.findFirst({
      where: { id },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // If session exists, verify ownership: the applicant must own the application
    if (userId && application.userId && application.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If no userId linked yet and session exists, link it now
    if (userId && !application.userId) {
      await db.application.update({
        where: { id },
        data: { userId },
      });
    }

    const body = await request.json();
    const { signatureData, printedName } = body;

    if (!signatureData || typeof signatureData !== "string") {
      return NextResponse.json(
        { error: "signatureData is required" },
        { status: 400 }
      );
    }

    if (!printedName || typeof printedName !== "string") {
      return NextResponse.json(
        { error: "printedName is required" },
        { status: 400 }
      );
    }

    // Only accept PNG data URLs
    if (!signatureData.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { error: "signatureData must be a PNG base64 data URL" },
        { status: 400 }
      );
    }

    if (userId) {
      // Logged-in user: upsert the DigitalSignature table (backward compat)
      const signature = await db.digitalSignature.upsert({
        where: { userId },
        update: {
          signatureData,
          printedName: printedName.trim(),
          updatedAt: new Date(),
        },
        create: {
          userId,
          signatureData,
          printedName: printedName.trim(),
        },
      });

      // Also store on Application record for consistency
      await db.application.update({
        where: { id },
        data: {
          signatureData,
          printedName: printedName.trim(),
        },
      });

      return NextResponse.json({
        success: true,
        signatureId: signature.id,
      });
    } else {
      // Non-logged-in user: store signature data directly on the Application record
      await db.application.update({
        where: { id },
        data: {
          signatureData,
          printedName: printedName.trim(),
        },
      });

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error) {
    console.error("Error saving signature:", error);
    return NextResponse.json(
      { error: "Failed to save signature" },
      { status: 500 }
    );
  }
}
