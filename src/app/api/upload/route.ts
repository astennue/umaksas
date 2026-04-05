import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Increase body size limit for file uploads (Vercel default is ~4.5MB)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Allowed file types per upload type
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/upload — Upload a file and return a base64 data URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "File upload failed: Request body too large or malformed. Try a smaller file (max 10MB) or check your network connection." },
        { status: 413 }
      );
    }

    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please select a file to upload." },
        { status: 400 }
      );
    }

    // Validate type
    if (!type || !["photo", "document"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid upload type. Must be 'photo' or 'document'." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Validate file size (non-zero)
    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty. Please select a valid file." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = type === "photo" ? ALLOWED_PHOTO_TYPES : ALLOWED_DOCUMENT_TYPES;
    if (!allowedTypes.includes(file.type)) {
      const expectedTypes = type === "photo"
        ? "JPEG, PNG, WebP, or GIF images"
        : "PDF, DOC, or DOCX documents";
      return NextResponse.json(
        { error: `Invalid file type. Only ${expectedTypes} are allowed.` },
        { status: 400 }
      );
    }

    // Convert file to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
