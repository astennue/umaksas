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
            profile: {
              select: {
                college: true,
                program: true,
                yearLevel: true,
                studentNumber: true,
                employeeId: true,
                dateHired: true,
                office: {
                  select: { name: true, code: true, location: true },
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
                firstName: true,
                lastName: true,
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
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // STUDENT_ASSISTANT can only view their own agreement document
    if (userRole === "STUDENT_ASSISTANT" && agreement.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate agreement document content
    const studentName = [
      agreement.user.firstName,
      agreement.user.middleName ? `${agreement.user.middleName.charAt(0)}.` : null,
      agreement.user.lastName,
      agreement.user.suffix,
    ]
      .filter(Boolean)
      .join(" ");

    const officeName = agreement.user.profile?.office?.name || "Not Assigned";
    const college = agreement.user.profile?.college || "Not Specified";
    const program = agreement.user.profile?.program || "Not Specified";

    const agreementContent = `
UNIVERSITY OF MAKATI
STUDENT ASSISTANT AGREEMENT
Academic Year ${agreement.academicYear} | ${agreement.semester}

Agreement Reference: ${agreement.documentRefNumber || "N/A"}
Date Created: ${new Date(agreement.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}

═══════════════════════════════════════════════════════════════

PARTIES TO THE AGREEMENT

This Agreement is entered into between:

THE UNIVERSITY OF MAKATI, represented by the Student Services Office,
hereinafter referred to as "the UNIVERSITY", and

${studentName.toUpperCase()}
Student Number: ${agreement.user.profile?.studentNumber || "N/A"}
College: ${college}
Program: ${program}
Office Assignment: ${officeName}
hereinafter referred to as "the STUDENT ASSISTANT".

═══════════════════════════════════════════════════════════════

ARTICLE I — PURPOSE

1.1 This Agreement establishes the terms and conditions under which the Student Assistant shall render service to the University of Makati during the ${agreement.academicYear}, ${agreement.semester}.

1.2 The Student Assistant Program aims to provide financial assistance to deserving students while developing their professional skills, work ethic, and sense of responsibility.

═══════════════════════════════════════════════════════════════

ARTICLE II — TERMS OF SERVICE

2.1 DURATION: This Agreement shall be effective for the entire duration of the ${agreement.semester} of Academic Year ${agreement.academicYear}.

2.2 WORK HOURS: The Student Assistant shall render a maximum of four (4) hours per day and twenty (20) hours per week, as determined by the assigned office.

2.3 SCHEDULE: The specific work schedule shall be coordinated with the assigned office supervisor and must not conflict with the Student Assistant's academic schedule.

2.4 WORK ASSIGNMENT: The Student Assistant shall be assigned to ${officeName} and shall perform tasks as directed by the office supervisor.

═══════════════════════════════════════════════════════════════

ARTICLE III — RESPONSIBILITIES OF THE STUDENT ASSISTANT

3.1 Report to the assigned office on time and observe the approved work schedule.

3.2 Perform duties diligently, honestly, and with professionalism.

3.3 Maintain confidentiality of all information and documents accessed during work.

3.4 Comply with all University rules, regulations, and policies.

3.5 Maintain satisfactory academic standing (no failing grades).

3.6 Not engage in any conduct that would bring disrepute to the University.

3.7 Inform the office supervisor in advance of any absence or tardiness.

3.8 Submit required reports and documents as may be required.

═══════════════════════════════════════════════════════════════

ARTICLE IV — RESPONSIBILITIES OF THE UNIVERSITY

4.1 Provide a safe and conducive working environment.

4.2 Assign a supervisor to guide and evaluate the Student Assistant.

4.3 Provide opportunities for professional development and training.

4.4 Monitor and evaluate the Student Assistant's performance regularly.

4.5 Address concerns and grievances in a timely and fair manner.

═══════════════════════════════════════════════════════════════

ARTICLE V — COMPENSATION AND BENEFITS

5.1 The Student Assistant shall receive a monthly stipend as determined by the University, subject to the number of hours rendered.

5.2 The stipend shall be processed through the University's payment system and released on a monthly basis.

5.3 The University shall provide a Certificate of Service upon satisfactory completion of the agreement period.

═══════════════════════════════════════════════════════════════

ARTICLE VI — TERMINATION

6.1 This Agreement may be terminated under the following circumstances:
    a) Completion of the agreement period
    b) Resignation by the Student Assistant with written notice
    c) Dismissal due to violation of terms
    d) Academic ineligibility
    e) Force majeure

6.2 The University reserves the right to terminate this Agreement if the Student Assistant fails to meet the terms and conditions stipulated herein.

═══════════════════════════════════════════════════════════════

ARTICLE VII — GENERAL PROVISIONS

7.1 This Agreement shall be governed by the rules and regulations of the University of Makati and applicable laws of the Republic of the Philippines.

7.2 Any amendments to this Agreement must be made in writing and signed by both parties.

7.3 The parties agree to resolve any disputes amicably through proper University channels.

7.4 By signing this Agreement, the Student Assistant acknowledges having read, understood, and agreed to all the terms and conditions herein.

═══════════════════════════════════════════════════════════════

SIGNATURES

STUDENT ASSISTANT:
${agreement.studentSignature
      ? `Name: ${studentName}
Date Signed: ${new Date(agreement.studentSignedAt!).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
Signature: ${agreement.studentSignature.signatureData}`
      : "NOT YET SIGNED"
    }

SUPERVISOR:
${agreement.supervisorSignature
      ? `Name: ${agreement.supervisorSignature.user.firstName} ${agreement.supervisorSignature.user.lastName}
Date Signed: ${new Date(agreement.supervisorSignedAt!).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
Signature: ${agreement.supervisorSignature.signatureData}`
      : "NOT YET SIGNED"
    }

═══════════════════════════════════════════════════════════════
This document was generated electronically by the UMAK Student Assistant Management System.
Reference: ${agreement.documentRefNumber || "N/A"}
Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}
`;

    return NextResponse.json({
      agreement: {
        id: agreement.id,
        academicYear: agreement.academicYear,
        semester: agreement.semester,
        documentRefNumber: agreement.documentRefNumber,
        studentSignedAt: agreement.studentSignedAt,
        supervisorSignedAt: agreement.supervisorSignedAt,
        agreedToTerms: agreement.agreedToTerms,
        createdAt: agreement.createdAt,
        studentSignature: agreement.studentSignature,
        supervisorSignature: agreement.supervisorSignature,
      },
      documentContent: agreementContent.trim(),
    });
  } catch (error) {
    console.error("Error generating agreement document:", error);
    return NextResponse.json({ error: "Failed to generate agreement document" }, { status: 500 });
  }
}
