"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Loader2 } from "lucide-react"

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    redirect("/portal-login")
  }

  const userRole = (session.user as { role?: string })?.role

  if (!userRole || !allowedRoles.includes(userRole)) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold text-muted-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">You do not have permission to view this page.</p>
      </div>
    )
  }

  return <>{children}</>
}
