import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import QRCode from "qrcode";
import {
  CertificateType,
  CertificateStatus,
  ApprovingAuthority,
  UserRole,
} from "@prisma/client";

// GET /api/certificates - List certificates with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      const searchTerms = search.split(/\s+/);
      where["AND"] = searchTerms.map((term) => ({
        OR: [
          { user: { firstName: { contains: term } } },
          { user: { lastName: { contains: term } } },
          { user: { email: { contains: term } } },
          { referenceNumber: { contains: term } },
          { title: { contains: term } },
          { officeAssigned: { contains: term } },
        ],
      }));
    }

    if (type && type !== "all") {
      where["type"] = type as CertificateType;
    }

    if (status && status !== "all") {
      where["status"] = status as CertificateStatus;
    }

    const [certificates, total] = await Promise.all([
      db.certificate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              email: true,
              photoUrl: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  office: {
                    select: { id: true, name: true, code: true },
                  },
                },
              },
            },
          },
        },
      }),
      db.certificate.count({ where }),
    ]);

    const result = certificates.map((cert) => ({
      id: cert.id,
      userId: cert.userId,
      firstName: cert.user.firstName || "",
      lastName: cert.user.lastName || "",
      middleName: cert.user.middleName || "",
      email: cert.user.email,
      photoUrl: cert.user.photoUrl,
      college: cert.user.profile?.college || null,
      program: cert.user.profile?.program || null,
      officeName: cert.user.profile?.office?.name || null,
      type: cert.type,
      referenceNumber: cert.referenceNumber,
      title: cert.title,
      officeAssigned: cert.officeAssigned,
      servicePeriod: cert.servicePeriod,
      serviceStartDate: cert.serviceStartDate?.toISOString() || null,
      serviceEndDate: cert.serviceEndDate?.toISOString() || null,
      dateIssued: cert.dateIssued?.toISOString() || null,
      approvingAuthority: cert.approvingAuthority,
      approvedByName: cert.approvedByName,
      approvedByTitle: cert.approvedByTitle,
      approvedAt: cert.approvedAt?.toISOString() || null,
      status: cert.status,
      revokedAt: cert.revokedAt?.toISOString() || null,
      revokedBy: cert.revokedBy,
      revokeReason: cert.revokeReason,
      qrCode: cert.qrCode,
      verificationUrl: cert.verificationUrl,
      documentUrl: cert.documentUrl,
      createdAt: cert.createdAt?.toISOString() || null,
    }));

    return NextResponse.json({
      certificates: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}

// POST /api/certificates - Create certificate (SUPER_ADMIN or ADVISER)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    if (user.role !== "SUPER_ADMIN" && user.role !== "ADVISER") {
      return NextResponse.json(
        { error: "Only Super Admin or Adviser can issue certificates" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      type,
      title,
      officeAssigned,
      servicePeriod,
      serviceStartDate,
      serviceEndDate,
      approvingAuthority,
      approvedByName,
      approvedByTitle,
      templateUrl,
    } = body;

    // Validate required fields
    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: "userId, type, and title are required" },
        { status: 400 }
      );
    }

    // Validate user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!targetUser.isActive) {
      return NextResponse.json(
        { error: "Cannot issue certificate to an inactive user" },
        { status: 400 }
      );
    }

    // Validate type
    if (!Object.values(CertificateType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid certificate type" },
        { status: 400 }
      );
    }

    // Validate approving authority
    if (!Object.values(ApprovingAuthority).includes(approvingAuthority)) {
      return NextResponse.json(
        { error: "Invalid approving authority" },
        { status: 400 }
      );
    }

    // Auto-generate reference number: CERT-YYYY-XXXXX
    const year = new Date().getFullYear();
    const prefix = `CERT-${year}-`;

    // Get the last certificate with this prefix to determine the next number
    const lastCert = await db.certificate.findFirst({
      where: {
        referenceNumber: { startsWith: prefix },
      },
      orderBy: { referenceNumber: "desc" },
      select: { referenceNumber: true },
    });

    let nextNum = 1;
    if (lastCert) {
      const parts = lastCert.referenceNumber.split("-");
      if (parts.length === 3) {
        nextNum = parseInt(parts[2], 10) + 1;
      }
    }

    const referenceNumber = `${prefix}${String(nextNum).padStart(5, "0")}`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXTAUTH_URL || "");
    const verificationUrl = `${baseUrl}/api/certificates/${referenceNumber}/verify`;

    // Generate QR code as data URL
    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#1e3a8a",
          light: "#ffffff",
        },
      });
    } catch (qrError) {
      console.error("Error generating QR code:", qrError);
    }

    // Get approving authority details from org chart if needed
    let finalApprovedByName = approvedByName;
    let finalApprovedByTitle = approvedByTitle;

    if (!finalApprovedByName && approvingAuthority === "PRESIDENT") {
      const orgChart = await db.orgChart.findFirst();
      if (orgChart) {
        finalApprovedByName = orgChart.presidentName;
        finalApprovedByTitle = orgChart.presidentTitle;
      }
    } else if (!finalApprovedByName && approvingAuthority === "ADVISER") {
      const orgChart = await db.orgChart.findFirst();
      if (orgChart) {
        finalApprovedByName = orgChart.adviserName;
        finalApprovedByTitle = orgChart.adviserTitle;
      }
    }

    // Create certificate
    const certificate = await db.certificate.create({
      data: {
        userId,
        type,
        referenceNumber,
        title,
        officeAssigned: officeAssigned || null,
        servicePeriod: servicePeriod || null,
        serviceStartDate: serviceStartDate ? new Date(serviceStartDate) : null,
        serviceEndDate: serviceEndDate ? new Date(serviceEndDate) : null,
        approvingAuthority,
        approvedByName: finalApprovedByName || null,
        approvedByTitle: finalApprovedByTitle || null,
        approvedAt: new Date(),
        status: CertificateStatus.ACTIVE,
        verificationUrl,
        qrCode: qrCodeDataUrl,
        documentUrl: templateUrl || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    console.error("Error creating certificate:", error);
    return NextResponse.json(
      { error: "Failed to create certificate" },
      { status: 500 }
    );
  }
}
