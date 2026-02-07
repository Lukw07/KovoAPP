import type { Role } from "@/generated/prisma/enums";
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      avatarUrl: string | null;
      departmentId: string | null;
      pointsBalance: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    avatarUrl: string | null;
    departmentId: string | null;
    pointsBalance: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    avatarUrl: string | null;
    departmentId: string | null;
    pointsBalance: number;
  }
}
