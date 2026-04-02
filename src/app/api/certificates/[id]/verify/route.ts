import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/certificates/[id]/verify - Verify certificate by reference number (public, no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: referenceNumber } = await params;

    const certificate = await db.certificate.findUnique({
      where: { referenceNumber },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        {
          valid: false,
          message: "Certificate not found. This reference number does not exist in our records.",
        },
        { status: 404 }
      );
    }

    const fullName = [certificate.user.firstName, certificate.user.middleName, certificate.user.lastName]
      .filter(Boolean)
      .join(" ");

    return NextResponse.json({
      valid: certificate.status === "ACTIVE",
      message:
        certificate.status === "ACTIVE"
          ? "This certificate is valid and active."
          : certificate.status === "REVOKED"
            ? "This certificate has been revoked."
            : "This certificate has expired.",
      certificate: {
        referenceNumber: certificate.referenceNumber,
        title: certificate.title,
        type: certificate.type,
        recipientName: fullName,
        officeAssigned: certificate.officeAssigned,
        servicePeriod: certificate.servicePeriod,
        serviceStartDate: certificate.serviceStartDate?.toISOString() || null,
        serviceEndDate: certificate.serviceEndDate?.toISOString() || null,
        dateIssued: certificate.dateIssued?.toISOString() || null,
        approvingAuthority: certificate.approvingAuthority,
        approvedByName: certificate.approvedByName,
        approvedByTitle: certificate.approvedByTitle,
        status: certificate.status,
        revokedAt: certificate.revokedAt?.toISOString() || null,
        revokeReason: certificate.revokeReason,
      },
    });
  } catch (error) {
    console.error("Error verifying certificate:", error);
    return NextResponse.json(
      { valid: false, message: "An error occurred while verifying the certificate." },
      { status: 500 }
    );
  }
}
