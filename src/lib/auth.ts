import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.warn(`Auth failed: No user found with email "${credentials.email}"`);
            return null;
          }

          if (!user.isActive) {
            console.warn(`Auth failed: User "${credentials.email}" is inactive (isActive=false)`);
            return null;
          }

          // Plain text password comparison (production should use bcrypt)
          if (credentials.password.trim() !== (user.password || "").trim()) {
            console.warn(`Auth failed: Password mismatch for user "${credentials.email}" (role: ${user.role})`);
            return null;
          }

          console.log(`Auth success: "${credentials.email}" logged in (role: ${user.role})`);

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
            role: user.role,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as unknown as { role: string }).role;
        token.firstName = (user as unknown as { firstName: string }).firstName;
        token.lastName = (user as unknown as { lastName: string }).lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { firstName: string }).firstName = token.firstName as string;
        (session.user as { lastName: string }).lastName = token.lastName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/portal-login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
