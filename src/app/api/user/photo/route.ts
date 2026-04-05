import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 60;

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_DIMENSION = 800; // Max width/height for compression

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "File too large or malformed. Try a smaller image (max 10MB)." }, { status: 413 });
    }

    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ error: "Photo must be less than 10MB" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, and GIF images are allowed" }, { status: 400 });
    }

    let dataUrl: string;

    // Try to compress with sharp, fallback to raw base64
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Dynamic import of sharp (reduces cold start bundle)
      const sharp = (await import("sharp")).default;

      const metadata = await sharp(buffer).metadata();
      const needsResize = (metadata.width && metadata.width > MAX_DIMENSION) || (metadata.height && metadata.height > MAX_DIMENSION);

      let processedBuffer: Buffer;
      if (needsResize) {
        processedBuffer = await sharp(buffer)
          .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
      } else if (file.type === "image/png" || file.type === "image/webp") {
        // Convert PNG/WebP to JPEG for smaller size
        processedBuffer = await sharp(buffer)
          .jpeg({ quality: 85 })
          .toBuffer();
      } else {
        processedBuffer = buffer;
      }

      const base64 = processedBuffer.toString("base64");
      dataUrl = `data:image/jpeg;base64,${base64}`;
    } catch {
      // Sharp not available or failed, use raw base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      dataUrl = `data:${file.type};base64,${base64}`;
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { photoUrl: dataUrl },
      select: { id: true, photoUrl: true },
    });

    return NextResponse.json({ photoUrl: updatedUser.photoUrl });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    await db.user.update({
      where: { id: userId },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing photo:", error);
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 });
  }
}
