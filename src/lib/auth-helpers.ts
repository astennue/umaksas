import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// Get current user from session, return null if not authenticated
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as { id: string; email: string; role: string; name: string };
}

// Check if user has one of the required roles
export function hasRole(user: { role: string } | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Require authentication - returns user or error response
export async function requireAuth(): Promise<{ user: { id: string; email: string; role: string; name: string } } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}

// Require specific role(s) - returns user or error response
export async function requireRole(roles: string[]): Promise<{ user: { id: string; email: string; role: string; name: string } } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { user };
}
