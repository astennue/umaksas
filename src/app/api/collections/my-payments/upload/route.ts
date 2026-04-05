import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/collections/my-payments/upload — Upload proof of payment image
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "File upload failed: Image too large or upload was interrupted. Max size is 10MB." },
        { status: 413 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty. Please select a valid image." },
        { status: 400 }
      );
    }

    let dataUrl: string;

    try {
      // Attempt compression with sharp (dynamic import)
      const sharp = (await import("sharp")).default;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const compressed = await sharp(buffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      dataUrl = `data:image/jpeg;base64,${compressed.toString("base64")}`;
    } catch {
      // Fallback to raw base64 without compression
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      dataUrl = `data:${file.type};base64,${base64}`;
    }

    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error("Error uploading proof of payment:", error);
    return NextResponse.json(
      { error: "Failed to upload proof of payment" },
      { status: 500 }
    );
  }
}
