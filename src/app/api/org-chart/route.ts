import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/org-chart - Returns the org chart data
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

// PUT /api/org-chart - Update org chart (SUPER_ADMIN, ADVISER, OFFICER only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userRole = (session.user as { role?: string }).role
    const allowedRoles = ["SUPER_ADMIN", "ADVISER", "OFFICER"]
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Unauthorized. Only SUPER_ADMIN, ADVISER, or OFFICER can update the org chart." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userRole: _userRole, ...data } = body

    const { presidentName, presidentTitle, presidentEmail, vpName, vpTitle, vpEmail, adviserName, adviserTitle, adviserEmail } = data

    const existing = await db.orgChart.findFirst()

    if (existing) {
      const updated = await db.orgChart.update({
        where: { id: existing.id },
        data: {
          ...(presidentName && { presidentName }),
          ...(presidentTitle && { presidentTitle }),
          ...(presidentEmail !== undefined && { presidentEmail }),
          ...(vpName && { vpName }),
          ...(vpTitle && { vpTitle }),
          ...(vpEmail !== undefined && { vpEmail }),
          ...(adviserName && { adviserName }),
          ...(adviserTitle && { adviserTitle }),
          ...(adviserEmail !== undefined && { adviserEmail }),
        },
      })
      return NextResponse.json(updated)
    } else {
      const created = await db.orgChart.create({
        data: {
          presidentName: presidentName || "Dr. Elyxzur C. Ramos",
          presidentTitle: presidentTitle || "University President",
          vpName: vpName || "Mr. Virgilio B. Tabbu",
          vpTitle: vpTitle || "Vice President for Student Services and Community Development",
          adviserName: adviserName || "Mr. Alvin John Y. Abejo",
          adviserTitle: adviserTitle || "UMak SAS Adviser",
          presidentEmail: presidentEmail || null,
          vpEmail: vpEmail || null,
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
