import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CertificateStatus, UserRole } from "@prisma/client";

// GET /api/certificates/[id] - Get certificate detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const certificate = await db.certificate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            phone: true,
            photoUrl: true,
            profile: {
              select: {
                college: true,
                program: true,
                yearLevel: true,
                studentNumber: true,
                office: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: certificate.id,
      userId: certificate.userId,
      firstName: certificate.user.firstName || "",
      lastName: certificate.user.lastName || "",
      middleName: certificate.user.middleName || "",
      fullName: [certificate.user.firstName, certificate.user.middleName, certificate.user.lastName]
        .filter(Boolean)
        .join(" "),
      email: certificate.user.email,
      phone: certificate.user.phone,
      photoUrl: certificate.user.photoUrl,
      studentNumber: certificate.user.profile?.studentNumber || null,
      college: certificate.user.profile?.college || null,
      program: certificate.user.profile?.program || null,
      yearLevel: certificate.user.profile?.yearLevel || null,
      officeName: certificate.user.profile?.office?.name || null,
      type: certificate.type,
      referenceNumber: certificate.referenceNumber,
      title: certificate.title,
      officeAssigned: certificate.officeAssigned,
      servicePeriod: certificate.servicePeriod,
      serviceStartDate: certificate.serviceStartDate?.toISOString() || null,
      serviceEndDate: certificate.serviceEndDate?.toISOString() || null,
      dateIssued: certificate.dateIssued?.toISOString() || null,
      approvingAuthority: certificate.approvingAuthority,
      approvedByName: certificate.approvedByName,
      approvedByTitle: certificate.approvedByTitle,
      approvedAt: certificate.approvedAt?.toISOString() || null,
      status: certificate.status,
      revokedAt: certificate.revokedAt?.toISOString() || null,
      revokedBy: certificate.revokedBy,
      revokeReason: certificate.revokeReason,
      qrCode: certificate.qrCode,
      verificationUrl: certificate.verificationUrl,
      documentUrl: certificate.documentUrl,
      createdAt: certificate.createdAt?.toISOString() || null,
      updatedAt: certificate.updatedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error fetching certificate:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}

// PUT /api/certificates/[id] - Update certificate (revoke, update status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { id } = await params;

    // Only SUPER_ADMIN can update certificates
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can update certificates" },
        { status: 403 }
      );
    }

    // Check certificate exists
    const existing = await db.certificate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, revokeReason, status, title, servicePeriod } = body;

    // Handle revoke action
    if (action === "revoke") {
      if (existing.status === CertificateStatus.REVOKED) {
        return NextResponse.json(
          { error: "Certificate is already revoked" },
          { status: 400 }
        );
      }

      if (!revokeReason) {
        return NextResponse.json(
          { error: "Revoke reason is required" },
          { status: 400 }
        );
      }

      const updated = await db.certificate.update({
        where: { id },
        data: {
          status: CertificateStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy: user.id,
          revokeReason,
        },
      });

      return NextResponse.json(updated);
    }

    // Handle reactivate action
    if (action === "reactivate") {
      const updated = await db.certificate.update({
        where: { id },
        data: {
          status: CertificateStatus.ACTIVE,
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
        },
      });

      return NextResponse.json(updated);
    }

    // Handle expire action
    if (action === "expire") {
      const updated = await db.certificate.update({
        where: { id },
        data: {
          status: CertificateStatus.EXPIRED,
        },
      });

      return NextResponse.json(updated);
    }

    // Handle general update
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (servicePeriod !== undefined) updateData.servicePeriod = servicePeriod;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await db.certificate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating certificate:", error);
    return NextResponse.json(
      { error: "Failed to update certificate" },
      { status: 500 }
    );
  }
}
