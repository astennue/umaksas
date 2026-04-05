import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function authenticate() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "SUPER_ADMIN" && userRole !== "OFFICER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  return { error: null, session };
}

// POST /api/system-settings/gcash-qr — upload & save QR code in one step
export async function POST(request: NextRequest) {
  try {
    const { error } = await authenticate();
    if (error) return error;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("Failed to parse QR upload body:", parseError);
      return NextResponse.json(
        { error: "QR code upload failed: Image file too large or upload was interrupted. Please try again with a smaller image (max 10MB)." },
        { status: 413 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // Convert file to base64 data URL server-side
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Upsert system settings with the new QR URL
    let settings = await db.systemSettings.findFirst();

    if (!settings) {
      settings = await db.systemSettings.create({
        data: {
          siteName: "UMAK Student Assistant Management System",
          applicationOpen: false,
          renewalOpen: false,
          maxWorkHoursPerDay: 4,
          monthlyPaymentFee: 20.0,
          gcashQrUrl: dataUrl,
        },
      });
    } else {
      settings = await db.systemSettings.update({
        where: { id: settings.id },
        data: { gcashQrUrl: dataUrl },
      });
    }

    return NextResponse.json({ gcashQrUrl: settings.gcashQrUrl });
  } catch (error) {
    console.error("Error uploading GCash QR code:", error);
    return NextResponse.json(
      { error: "Failed to upload QR code" },
      { status: 500 },
    );
  }
}

// DELETE /api/system-settings/gcash-qr — remove the QR code
export async function DELETE() {
  try {
    const { error } = await authenticate();
    if (error) return error;

    let settings = await db.systemSettings.findFirst();

    if (!settings) {
      // Nothing to delete — already clean
      return NextResponse.json({ success: true });
    }

    await db.systemSettings.update({
      where: { id: settings.id },
      data: { gcashQrUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting GCash QR code:", error);
    return NextResponse.json(
      { error: "Failed to delete QR code" },
      { status: 500 },
    );
  }
}
