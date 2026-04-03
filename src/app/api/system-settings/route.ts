import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/system-settings - Public-safe fields
export async function GET() {
  try {
    let settings = await db.systemSettings.findFirst();

    if (!settings) {
      settings = await db.systemSettings.create({
        data: {
          siteName: "UMAK Student Assistant Management System",
          applicationOpen: false,
          renewalOpen: false,
          maxWorkHoursPerDay: 4,
          monthlyPaymentFee: 20.00,
        },
      });
    }

    return NextResponse.json({
      id: settings.id,
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      logoUrl: settings.logoUrl,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      contactAddress: settings.contactAddress,
      academicYear: settings.academicYear,
      currentSemester: settings.currentSemester,
      applicationOpen: settings.applicationOpen,
      renewalOpen: settings.renewalOpen,
      maxWorkHoursPerDay: settings.maxWorkHoursPerDay,
      monthlyPaymentFee: settings.monthlyPaymentFee,
      paymentCollectionEnabled: settings.paymentCollectionEnabled,
      gcashQrUrl: settings.gcashQrUrl,
      gcashNumber: settings.gcashNumber,
      paymentInstructions: settings.paymentInstructions,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 }
    );
  }
}

// PUT /api/system-settings - SUPER_ADMIN or ADVISER
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;

    // Check role - only SUPER_ADMIN, ADVISER, and OFFICER can modify settings
    if (userRole !== "SUPER_ADMIN" && userRole !== "ADVISER" && userRole !== "OFFICER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // ADVISER cannot modify payment collection settings
    if (userRole === "ADVISER") {
      const paymentFields = ["paymentCollectionEnabled", "gcashQrUrl", "gcashNumber", "paymentInstructions"];
      const attemptedPaymentField = paymentFields.find(field => body[field] !== undefined);
      if (attemptedPaymentField) {
        return NextResponse.json(
          { error: "Forbidden. Advisers cannot modify payment settings." },
          { status: 403 }
        );
      }
    }

    // OFFICER can only modify payment and season fields, NOT academic/rubric fields
    if (userRole === "OFFICER") {
      const allowedFields = ["paymentCollectionEnabled", "gcashQrUrl", "gcashNumber", "paymentInstructions", "applicationOpen", "renewalOpen"];
      const allBodyFields = Object.keys(body);
      const disallowedField = allBodyFields.find(field => !allowedFields.includes(field));
      if (disallowedField) {
        return NextResponse.json(
          { error: "Forbidden. Officers can only modify payment and season settings." },
          { status: 403 }
        );
      }
    }
    const {
      siteName,
      siteDescription,
      contactEmail,
      contactPhone,
      contactAddress,
      facebookUrl,
      twitterUrl,
      instagramUrl,
      linkedinUrl,
      academicYear,
      currentSemester,
      applicationOpen,
      renewalOpen,
      maxWorkHoursPerDay,
      monthlyPaymentFee,
      paymentCollectionEnabled,
      gcashQrUrl,
      gcashNumber,
      paymentInstructions,
      rubricAcademic,
      rubricInterview,
      rubricSkills,
      rubricCharacter,
    } = body;

    let settings = await db.systemSettings.findFirst();

    // Track previous state for auto-generation trigger
    const previousPaymentEnabled = settings?.paymentCollectionEnabled ?? false;

    if (!settings) {
      settings = await db.systemSettings.create({
        data: {
          siteName: siteName || "UMAK Student Assistant Management System",
          siteDescription,
          contactEmail,
          contactPhone,
          contactAddress,
          facebookUrl,
          twitterUrl,
          instagramUrl,
          linkedinUrl,
          academicYear,
          currentSemester,
          applicationOpen: applicationOpen ?? false,
          renewalOpen: renewalOpen ?? false,
          maxWorkHoursPerDay: maxWorkHoursPerDay ?? 4,
          monthlyPaymentFee: monthlyPaymentFee ?? 20.00,
          paymentCollectionEnabled: paymentCollectionEnabled ?? false,
          gcashQrUrl,
          gcashNumber,
          paymentInstructions,
          rubricAcademic: rubricAcademic ?? 25,
          rubricInterview: rubricInterview ?? 25,
          rubricSkills: rubricSkills ?? 25,
          rubricCharacter: rubricCharacter ?? 25,
        },
      });
    } else {
      settings = await db.systemSettings.update({
        where: { id: settings.id },
        data: {
          ...(siteName !== undefined && { siteName }),
          ...(siteDescription !== undefined && { siteDescription }),
          ...(contactEmail !== undefined && { contactEmail }),
          ...(contactPhone !== undefined && { contactPhone }),
          ...(contactAddress !== undefined && { contactAddress }),
          ...(facebookUrl !== undefined && { facebookUrl }),
          ...(twitterUrl !== undefined && { twitterUrl }),
          ...(instagramUrl !== undefined && { instagramUrl }),
          ...(linkedinUrl !== undefined && { linkedinUrl }),
          ...(academicYear !== undefined && { academicYear }),
          ...(currentSemester !== undefined && { currentSemester }),
          ...(applicationOpen !== undefined && { applicationOpen }),
          ...(renewalOpen !== undefined && { renewalOpen }),
          ...(maxWorkHoursPerDay !== undefined && { maxWorkHoursPerDay }),
          ...(monthlyPaymentFee !== undefined && { monthlyPaymentFee }),
          ...(paymentCollectionEnabled !== undefined && { paymentCollectionEnabled }),
          ...(gcashQrUrl !== undefined && { gcashQrUrl }),
          ...(gcashNumber !== undefined && { gcashNumber }),
          ...(paymentInstructions !== undefined && { paymentInstructions }),
          ...(rubricAcademic !== undefined && { rubricAcademic }),
          ...(rubricInterview !== undefined && { rubricInterview }),
          ...(rubricSkills !== undefined && { rubricSkills }),
          ...(rubricCharacter !== undefined && { rubricCharacter }),
        },
      });
    }

    // Auto-generate payments when payment collection is newly activated
    if (paymentCollectionEnabled === true && !previousPaymentEnabled) {
      try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();
        const monthlyFee = monthlyPaymentFee ?? settings.monthlyPaymentFee ?? 20;

        // Get all active SA profiles
        const activeSAs = await db.sAProfile.findMany({
          where: { status: "ACTIVE" },
          select: { userId: true },
        });

        let created = 0;
        let skipped = 0;

        for (const sa of activeSAs) {
          const existing = await db.payment.findUnique({
            where: {
              userId_month_year: {
                userId: sa.userId,
                month: currentMonth,
                year: currentYear,
              },
            },
          });

          if (!existing) {
            const refNum = `PAY-${currentYear}${String(currentMonth).padStart(2, "0")}-${Date.now().toString(36).toUpperCase()}`;
            await db.payment.create({
              data: {
                userId: sa.userId,
                month: currentMonth,
                year: currentYear,
                amount: monthlyFee,
                referenceNumber: refNum,
                status: "UNPAID",
              },
            });

            const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            await db.notification.create({
              data: {
                userId: sa.userId,
                type: "PAYMENT_DUE",
                title: "Payment Due",
                message: `Organizational fee payment for ${monthNames[currentMonth]} ${currentYear} is now due. Please visit the Payments page to submit your payment.`,
                link: "/dashboard/payments",
              },
            });
            created++;
          } else {
            skipped++;
          }
        }

        console.log(`Auto-generated ${created} payments (${skipped} already existed)`);
      } catch (autoGenError) {
        console.error("Error auto-generating payments:", autoGenError);
      }
    }

    return NextResponse.json({
      id: settings.id,
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      contactAddress: settings.contactAddress,
      academicYear: settings.academicYear,
      currentSemester: settings.currentSemester,
      applicationOpen: settings.applicationOpen,
      renewalOpen: settings.renewalOpen,
      maxWorkHoursPerDay: settings.maxWorkHoursPerDay,
      monthlyPaymentFee: settings.monthlyPaymentFee,
      paymentCollectionEnabled: settings.paymentCollectionEnabled,
      gcashQrUrl: settings.gcashQrUrl,
      gcashNumber: settings.gcashNumber,
      paymentInstructions: settings.paymentInstructions,
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "Failed to update system settings" },
      { status: 500 }
    );
  }
}
