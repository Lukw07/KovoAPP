import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { logAudit } from "@/lib/audit";

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
