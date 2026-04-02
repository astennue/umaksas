import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/renewals/[id] - Get single renewal
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { id } = await params;

    const renewal = await db.renewal.findUnique({
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
            role: true,
            profile: {
              select: {
                college: true,
                program: true,
                yearLevel: true,
                studentNumber: true,
                officeId: true,
                office: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        newOffice: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
          },
        },
      },
    });

    if (!renewal) {
      return NextResponse.json(
        { error: "Renewal not found" },
        { status: 404 }
      );
    }

    // STUDENT_ASSISTANT can only view their own renewal
    if (user.role === "STUDENT_ASSISTANT" && renewal.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If reviewed, fetch reviewer info
    let reviewedByUser = null;
    if (renewal.reviewedBy) {
      const reviewer = await db.user.findUnique({
        where: { id: renewal.reviewedBy },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });
      if (reviewer) {
        reviewedByUser = reviewer;
      }
    }

    return NextResponse.json({ renewal, reviewedByUser });
  } catch (error) {
    console.error("Error fetching renewal:", error);
    return NextResponse.json(
      { error: "Failed to fetch renewal" },
      { status: 500 }
    );
  }
}

// PUT /api/renewals/[id] - Update renewal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    const { id } = await params;
    const body = await request.json();

    const existing = await db.renewal.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, profile: { select: { officeId: true } } },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Renewal not found" },
        { status: 404 }
      );
    }

    // SA can update their own renewal if status is REQUIRES_CHANGES
    if (user.role === "STUDENT_ASSISTANT") {
      if (existing.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "REQUIRES_CHANGES") {
        return NextResponse.json(
          { error: "You can only update a renewal that requires changes" },
          { status: 400 }
        );
      }

      // Validate required documents
      const intentUrl = body.intentLetterUrl || existing.intentLetterUrl;
      const gradeUrl = body.reportOfGradeUrl || existing.reportOfGradeUrl;
      const corU = body.corUrl || existing.corUrl;

      if (!gradeUrl) {
        return NextResponse.json(
          { error: "Report of grades is required" },
          { status: 400 }
        );
      }
      if (!corU) {
        return NextResponse.json(
          { error: "Certificate of Registration (COR) is required" },
          { status: 400 }
        );
      }

      const updated = await db.renewal.update({
        where: { id },
        data: {
          ...(body.statementOfIntent !== undefined && {
            statementOfIntent: body.statementOfIntent,
          }),
          ...(body.availabilityJson !== undefined && {
            availabilityJson: body.availabilityJson,
          }),
          ...(body.requestTransfer !== undefined && {
            requestTransfer: body.requestTransfer,
          }),
          ...(body.transferReason !== undefined && {
            transferReason: body.transferReason,
          }),
          ...(body.newOfficeId !== undefined && {
            newOfficeId: body.newOfficeId,
          }),
          ...(body.intentLetterUrl !== undefined && {
            intentLetterUrl: body.intentLetterUrl,
          }),
          ...(body.reportOfGradeUrl !== undefined && {
            reportOfGradeUrl: body.reportOfGradeUrl,
          }),
          ...(body.corUrl !== undefined && {
            corUrl: body.corUrl,
          }),
          status: "PENDING_REVIEW",
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          submittedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  yearLevel: true,
                  studentNumber: true,
                  office: {
                    select: { name: true, code: true },
                  },
                },
              },
            },
          },
          newOffice: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      return NextResponse.json({
        renewal: updated,
        message: "Renewal updated successfully",
      });
    }

    // SUPER_ADMIN, ADVISER, or OFFICER can review
    if (
      user.role === "SUPER_ADMIN" ||
      user.role === "ADVISER" ||
      user.role === "OFFICER"
    ) {
      const { status, reviewNotes } = body;

      if (!status || !["UNDER_REVIEW", "APPROVED", "REJECTED", "REQUIRES_CHANGES"].includes(status)) {
        return NextResponse.json(
          { error: "Valid status is required" },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {
        status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      };

      if (reviewNotes !== undefined) {
        updateData.reviewNotes = reviewNotes;
      }

      // If approving with transfer request, update the SA's office assignment
      if (status === "APPROVED" && existing.requestTransfer && existing.newOfficeId) {
        if (!body.confirmTransfer) {
          return NextResponse.json(
            { error: "You must confirm the office transfer when approving a transfer request" },
            { status: 400 }
          );
        }

        // Update the SA's office
        await db.sAProfile.update({
          where: { userId: existing.userId },
          data: {
            officeId: existing.newOfficeId,
          },
        });
      }

      const updated = await db.renewal.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  yearLevel: true,
                  studentNumber: true,
                  office: {
                    select: { name: true, code: true },
                  },
                },
              },
            },
          },
          newOffice: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      return NextResponse.json({
        renewal: updated,
        message: `Renewal ${status.toLowerCase()}`,
      });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error updating renewal:", error);
    return NextResponse.json(
      { error: "Failed to update renewal" },
      { status: 500 }
    );
  }
}
