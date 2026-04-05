import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/org-chart - Returns the org chart data (public)
export async function GET() {
  try {
    const orgChart = await db.orgChart.findFirst()
    
    if (!orgChart) {
      return NextResponse.json(
        { error: "Org chart not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(orgChart)
  } catch (error) {
    console.error("Error fetching org chart:", error)
    return NextResponse.json(
      { error: "Failed to fetch org chart" },
      { status: 500 }
    )
  }
}

// PUT /api/org-chart - Update org chart (SUPER_ADMIN, ADVISER, SAS PRESIDENT only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = (session.user as { id?: string }).id
    const userRole = (session.user as { role?: string }).role

    // Check if user is allowed: SUPER_ADMIN, ADVISER, or SAS President (OFFICER with PRESIDENT position)
    if (userRole === "SUPER_ADMIN" || userRole === "ADVISER") {
      // Allowed
    } else if (userRole === "OFFICER" && userId) {
      // Check if this officer is the SAS President
      const officerProfile = await db.officerProfile.findFirst({
        where: { userId, position: "PRESIDENT" },
      })
      if (!officerProfile) {
        return NextResponse.json(
          { error: "Unauthorized. Only SUPER_ADMIN, ADVISER, or SAS President can update the org chart." },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Unauthorized. Only SUPER_ADMIN, ADVISER, or SAS President can update the org chart." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userRole: _userRole, ...data } = body

    const {
      presidentName,
      presidentTitle,
      presidentEmail,
      presidentPhotoUrl,
      vpName,
      vpTitle,
      vpEmail,
      vpPhotoUrl,
      adviserName,
      adviserTitle,
      adviserEmail,
    } = data

    const existing = await db.orgChart.findFirst()

    if (existing) {
      const updated = await db.orgChart.update({
        where: { id: existing.id },
        data: {
          ...(presidentName !== undefined && { presidentName }),
          ...(presidentTitle !== undefined && { presidentTitle }),
          ...(presidentEmail !== undefined && { presidentEmail }),
          ...(presidentPhotoUrl !== undefined && { presidentPhotoUrl }),
          ...(vpName !== undefined && { vpName }),
          ...(vpTitle !== undefined && { vpTitle }),
          ...(vpEmail !== undefined && { vpEmail }),
          ...(vpPhotoUrl !== undefined && { vpPhotoUrl }),
          ...(adviserName !== undefined && { adviserName }),
          ...(adviserTitle !== undefined && { adviserTitle }),
          ...(adviserEmail !== undefined && { adviserEmail }),
        },
      })
      return NextResponse.json(updated)
    } else {
      const created = await db.orgChart.create({
        data: {
          presidentName: presidentName || "Dr. Elyxzur C. Ramos",
          presidentTitle: presidentTitle || "University President",
          presidentEmail: presidentEmail || null,
          presidentPhotoUrl: presidentPhotoUrl || null,
          vpName: vpName || "Mr. Virgilio B. Tabbu",
          vpTitle: vpTitle || "Vice President for Student Services and Community Development",
          vpEmail: vpEmail || null,
          vpPhotoUrl: vpPhotoUrl || null,
          adviserName: adviserName || "Mr. Alvin John Y. Abejo",
          adviserTitle: adviserTitle || "UMak SAS Adviser",
          adviserEmail: adviserEmail || null,
        },
      })
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error("Error updating org chart:", error)
    return NextResponse.json(
      { error: "Failed to update org chart" },
      { status: 500 }
    )
  }
}
