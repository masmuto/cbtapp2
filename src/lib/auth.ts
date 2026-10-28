import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// NextAuth v4 configuration — uses credentials (username/email + password).
// Sesi menyimpan userId dan daftar keanggotaan sekolah+peran untuk RBAC.

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email atau Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        const idf = credentials.identifier.trim().toLowerCase();
        const user = await db.user.findFirst({
          where: {
            OR: [{ email: idf }, { username: idf }],
            isActive: true,
          },
          include: {
            memberships: {
              where: { status: "active" },
              include: { school: { select: { id: true, name: true, code: true, level: true, timezone: true } } },
            },
          },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          // role data dipasang via jwt callback
          isSuperadmin: user.isSuperadmin,
          memberships: user.memberships.map((m) => ({
            schoolId: m.schoolId,
            role: m.role,
            schoolName: m.school.name,
            schoolCode: m.school.code,
            schoolLevel: m.school.level,
            timezone: m.school.timezone,
          })),
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.name = user.name;
        token.isSuperadmin = (user as any).isSuperadmin ?? false;
        token.memberships = (user as any).memberships ?? [];
        // Default active school = membership pertama (superadmin → null)
        if (!token.isSuperadmin && (token.memberships as any[]).length > 0) {
          token.activeSchoolId = (token.memberships as any[])[0].schoolId;
          token.activeRole = (token.memberships as any[])[0].role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).isSuperadmin = token.isSuperadmin;
        (session.user as any).memberships = token.memberships;
        (session.user as any).activeSchoolId = token.activeSchoolId;
        (session.user as any).activeRole = token.activeRole;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "cbt-sekolah-dev-secret-change-me",
};

// Augment NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      isSuperadmin: boolean;
      memberships: Array<{
        schoolId: string;
        role: string;
        schoolName: string;
        schoolCode: string;
        schoolLevel: string;
        timezone: string;
      }>;
      activeSchoolId?: string;
      activeRole?: string;
    };
  }
}
