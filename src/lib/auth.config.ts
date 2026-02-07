/**
 * Lightweight auth config for Edge middleware.
 * This file must NOT import PrismaClient or any Node.js-only modules.
 * The full auth config with PrismaAdapter is in auth.ts (Node.js runtime).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Credentials provider must be listed here for the middleware to
    // recognize JWT sessions, but the actual `authorize` logic lives
    // in src/lib/auth.ts (Node.js runtime).
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // This is a stub — the real authorize runs server-side in auth.ts
      authorize: () => null,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.id = user.id!;
        token.role = u.role as Role;
        token.avatarUrl = u.avatarUrl as string | null;
        token.departmentId = u.departmentId as string | null;
        token.pointsBalance = u.pointsBalance as number;
      }
      if (trigger === "update" && session) {
        if (session.pointsBalance !== undefined)
          token.pointsBalance = session.pointsBalance;
        if (session.avatarUrl !== undefined)
          token.avatarUrl = session.avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.avatarUrl = token.avatarUrl as string | null;
        session.user.departmentId = token.departmentId as string | null;
        session.user.pointsBalance = token.pointsBalance as number;
      }
      return session;
    },
    async authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      if (isOnLogin) {
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;

// Edge-compatible auth for middleware
export const { auth: authMiddleware } = NextAuth(authConfig);
