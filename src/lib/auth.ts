import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Zod schema for login validation
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(1, "Heslo je povinné"),
});

// ---------------------------------------------------------------------------
// NextAuth v5 Configuration (Node.js runtime — full version with Prisma)
// ---------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // Cast to satisfy type mismatch between @auth/prisma-adapter's @auth/core
  // and next-auth's bundled @auth/core (different copies with extended types).
  adapter: PrismaAdapter(prisma) as never,

  callbacks: {
    ...authConfig.callbacks,
    // Override JWT callback to re-fetch pointsBalance from DB on every
    // token refresh. The Edge-friendly callback in auth.config.ts can't
    // import Prisma, so we do it here (Node.js runtime).
    async jwt({ token, user, trigger, session }) {
      // Initial login — bake user data into the token
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.id = user.id!;
        token.role = u.role as Role;
        token.avatarUrl = u.avatarUrl as string | null;
        token.departmentId = u.departmentId as string | null;
        token.pointsBalance = u.pointsBalance as number;
      }

      // Client-side session.update() call
      if (trigger === "update" && session) {
        if (session.pointsBalance !== undefined)
          token.pointsBalance = session.pointsBalance;
        if (session.avatarUrl !== undefined)
          token.avatarUrl = session.avatarUrl;
      }

      // On every subsequent token refresh — re-read pointsBalance from DB
      // so it stays fresh (max ~15 min staleness per updateAge setting)
      if (!user && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { pointsBalance: true, role: true, avatarUrl: true },
          });
          if (dbUser) {
            token.pointsBalance = dbUser.pointsBalance;
            token.role = dbUser.role;
            token.avatarUrl = dbUser.avatarUrl;
          }
        } catch {
          // DB unavailable — keep stale value
        }
      }

      return token;
    },
  },

  // Override providers with the real authorize function
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            avatarUrl: true,
            departmentId: true,
            pointsBalance: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.password,
        );
        if (!passwordMatch) {
          // Log failed login attempt for security audit
          logAudit({
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            performedBy: "system",
            details: { email: parsed.data.email, reason: "invalid_password" },
          });
          return null;
        }

        // Log successful login
        logAudit({
          action: "LOGIN_SUCCESS",
          entityType: "User",
          entityId: user.id,
          performedBy: user.id,
          details: { email: user.email },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          departmentId: user.departmentId,
          pointsBalance: user.pointsBalance,
        };
      },
    }),
  ],
});
