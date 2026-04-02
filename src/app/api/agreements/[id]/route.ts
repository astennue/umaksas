import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id?: string })?.id;
    const { id } = await params;

    const agreement = await db.agreement.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            email: true,
            phone: true,
            photoUrl: true,
            role: true,
            profile: {
              select: {
                college: true,
                program: true,
                yearLevel: true,
                studentNumber: true,
                employeeId: true,
                dateHired: true,
                office: {
                  select: { name: true, code: true, email: true, location: true },
                },
              },
            },
          },
        },
        studentSignature: {
          select: {
            id: true,
            signatureData: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        supervisorSignature: {
          select: {
            id: true,
            signatureData: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // STUDENT_ASSISTANT can only view their own agreement
    if (userRole === "STUDENT_ASSISTANT" && agreement.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ agreement });
  } catch (error) {
    console.error("Error fetching agreement:", error);
    return NextResponse.json({ error: "Failed to fetch agreement" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id?: string })?.id;
    const { id } = await params;

    const body = await req.json();
    const { role, signatureData } = body;

    if (!role || !signatureData) {
      return NextResponse.json({ error: "role and signatureData are required" }, { status: 400 });
    }

    // Verify agreement exists
    const agreement = await db.agreement.findUnique({
      where: { id },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    if (role === "student") {
      // Only the SA themselves can sign as student
      if (userRole !== "STUDENT_ASSISTANT" || agreement.userId !== userId) {
        return NextResponse.json({ error: "Only the student can sign as student" }, { status: 403 });
      }

      if (agreement.studentSignedAt) {
        return NextResponse.json({ error: "Student has already signed this agreement" }, { status: 400 });
      }

      // Create or update digital signature
      const signature = await db.digitalSignature.upsert({
        where: { userId: userId! },
        create: {
          userId: userId!,
          signatureData,
        },
        update: {
          signatureData,
        },
      });

      // Update agreement
      const updated = await db.agreement.update({
        where: { id },
        data: {
          agreedToTerms: true,
          studentSignedAt: new Date(),
          studentSignatureId: signature.id,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  office: {
                    select: { name: true, code: true },
                  },
                },
              },
            },
          },
          studentSignature: true,
          supervisorSignature: true,
        },
      });

      return NextResponse.json({ agreement: updated });
    }

    if (role === "supervisor") {
      // SUPER_ADMIN, ADVISER, HRMO can sign as supervisor
      const supervisorRoles = ["SUPER_ADMIN", "ADVISER", "HRMO"];
      if (!supervisorRoles.includes(userRole || "")) {
        return NextResponse.json({ error: "Only SUPER_ADMIN, ADVISER, or HRMO can sign as supervisor" }, { status: 403 });
      }

      if (agreement.supervisorSignedAt) {
        return NextResponse.json({ error: "Supervisor has already signed this agreement" }, { status: 400 });
      }

      if (!agreement.studentSignedAt) {
        return NextResponse.json({ error: "Student must sign first before supervisor can sign" }, { status: 400 });
      }

      // Create or update digital signature for supervisor
      const signature = await db.digitalSignature.upsert({
        where: { userId: userId! },
        create: {
          userId: userId!,
          signatureData,
        },
        update: {
          signatureData,
        },
      });

      // Update agreement
      const updated = await db.agreement.update({
        where: { id },
        data: {
          supervisorSignedAt: new Date(),
          supervisorSignatureId: signature.id,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  college: true,
                  program: true,
                  office: {
                    select: { name: true, code: true },
                  },
                },
              },
            },
          },
          studentSignature: true,
          supervisorSignature: {
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
          },
        },
      });

      // Create notification for the student that their agreement has been fully signed
      if (updated.studentSignedAt && updated.supervisorSignedAt) {
        await db.notification.create({
          data: {
            userId: agreement.userId,
            type: "SYSTEM",
            title: "Agreement Fully Signed",
            message: `Your agreement for ${agreement.academicYear} ${agreement.semester} has been signed by both you and the supervisor.`,
            link: "/dashboard/agreements",
          },
        });
      }

      return NextResponse.json({ agreement: updated });
    }

    return NextResponse.json({ error: "Invalid role. Must be 'student' or 'supervisor'" }, { status: 400 });
  } catch (error) {
    console.error("Error signing agreement:", error);
    return NextResponse.json({ error: "Failed to sign agreement" }, { status: 500 });
  }
}
