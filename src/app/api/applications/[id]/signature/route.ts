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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

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

    // Verify ownership: the applicant must own the application
    if (application.userId && application.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If no userId linked yet, link it now and allow (don't block by email mismatch)
    if (!application.userId) {
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

    // Upsert the digital signature (with printedName)
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

    return NextResponse.json({
      success: true,
      signatureId: signature.id,
    });
  } catch (error) {
    console.error("Error saving signature:", error);
    return NextResponse.json(
      { error: "Failed to save signature" },
      { status: 500 }
    );
  }
}
