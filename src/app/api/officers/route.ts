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

    const formattedOfficers = officers.map((officer) => ({
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
    }))

    const formattedAdviser = adviser ? {
      id: adviser.id,
      userId: adviser.userId,
      position: adviser.position,
      positionLabel: positionLabels[adviser.position] || adviser.position,
      orderIndex: adviser.orderIndex,
      email: adviser.email,
      phone: adviser.phone,
      user: {
        ...adviser.user,
        fullName: `${adviser.user.firstName || ""} ${adviser.user.middleName ? adviser.user.middleName.charAt(0) + "." : ""} ${adviser.user.lastName || ""}`.trim(),
      },
    } : null

    return NextResponse.json({
      officers: formattedOfficers,
      adviser: formattedAdviser,
    })
  } catch (error) {
    console.error("Error fetching officers:", error)
    return NextResponse.json(
      { error: "Failed to fetch officers" },
      { status: 500 }
    )
  }
}
