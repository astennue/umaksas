import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/officers - Returns all officers with their profiles
export async function GET() {
  try {
    const officers = await db.officerProfile.findMany({
      where: {
        position: {
          notIn: ["ADVISER"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            photoUrl: true,
            role: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        orderIndex: "asc",
      },
    })

    // Get the adviser separately
    const adviser = await db.officerProfile.findFirst({
      where: {
        position: "ADVISER",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            email: true,
            photoUrl: true,
            role: true,
            isActive: true,
          },
        },
      },
    })

    const positionLabels: Record<string, string> = {
      PRESIDENT: "President",
      VICE_PRESIDENT_INTERNAL: "Vice President - Internal",
      VICE_PRESIDENT_EXTERNAL: "Vice President - External",
      SECRETARY: "Secretary",
      TREASURER: "Treasurer",
      AUDITOR: "Auditor",
      PUBLIC_RELATION_OFFICER: "Public Relations Officer",
      ADVISER: "Adviser",
    }

    // Helper to format an officer with SA profile data if available
    const formatOfficer = (officer: typeof officers[0]) => {
      return {
        id: officer.id,
        userId: officer.userId,
        position: officer.position,
        positionLabel: positionLabels[officer.position] || officer.position,
        orderIndex: officer.orderIndex,
        email: officer.email,
        phone: officer.phone,
        user: {
          ...officer.user,
          fullName: `${officer.user.firstName || ""} ${officer.user.middleName ? officer.user.middleName.charAt(0) + "." : ""} ${officer.user.lastName || ""}`.trim(),
        },
      }
    }

    const formattedOfficers = officers.map(formatOfficer)
    const formattedAdviser = adviser ? formatOfficer(adviser) : null

    // Fetch SA profiles for officers who have them (for college, program, office data)
    const officerUserIds = [
      ...formattedOfficers.map((o) => o.userId),
      ...(formattedAdviser ? [formattedAdviser.userId] : []),
    ]

    let saProfileMap: Record<string, { college: string | null; program: string | null; officeName: string | null; officeEmail: string | null }> = {}

    if (officerUserIds.length > 0) {
      const saProfiles = await db.sAProfile.findMany({
        where: {
          userId: { in: officerUserIds },
        },
        include: {
          office: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      saProfiles.forEach((profile) => {
        saProfileMap[profile.userId] = {
          college: profile.college || null,
          program: profile.program || null,
          officeName: profile.office?.name || null,
          officeEmail: profile.office?.email || null,
        }
      })
    }

    // Attach SA profile data to each officer
    const enrichOfficer = (officer: typeof formattedOfficers[0]) => ({
      ...officer,
      college: saProfileMap[officer.userId]?.college || null,
      program: saProfileMap[officer.userId]?.program || null,
      officeName: saProfileMap[officer.userId]?.officeName || null,
      officeEmail: saProfileMap[officer.userId]?.officeEmail || null,
    })

    return NextResponse.json({
      officers: formattedOfficers.map(enrichOfficer),
      adviser: formattedAdviser ? enrichOfficer(formattedAdviser) : null,
    })
  } catch (error) {
    console.error("Error fetching officers:", error)
    return NextResponse.json(
      { error: "Failed to fetch officers" },
      { status: 500 }
    )
  }
}
