"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkRateLimitAsync, SENSITIVE_ACTION_LIMITER, ACTION_LIMITER } from "@/lib/rate-limit";
import { getClientIp, containsSuspiciousContent } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/generated/prisma/enums";

// ============================================================================
// Server Action Security Guard — centralized auth + rate limit + audit
// ============================================================================

interface GuardOptions {
  /** Required minimum role (EMPLOYEE < MANAGER < ADMIN) */
  requiredRole?: Role | Role[];
  /** Use sensitive-action rate limiter instead of default */
  sensitive?: boolean;
  /** Custom rate limit key prefix */
  rateLimitPrefix?: string;
  /** Skip rate limiting */
  skipRateLimit?: boolean;
}

interface GuardResult {
  userId: string;
  userRole: Role;
  userName: string;
  ip: string;
}

const ROLE_HIERARCHY: Record<Role, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  ADMIN: 2,
};

/**
 * Unified security guard for server actions.
 * Validates session, role, rate limits, and returns user context.
 * Throws descriptive errors on failure.
 */
export async function actionGuard(
  options: GuardOptions = {},
): Promise<GuardResult> {
  // 1. Session validation
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Nepřihlášen");
  }

  const userId = session.user.id;
  const userRole = session.user.role as Role;
  const userName = session.user.name || "Unknown";

  // 2. Role check
  if (options.requiredRole) {
    const requiredRoles = Array.isArray(options.requiredRole)
      ? options.requiredRole
      : [options.requiredRole];

    const hasRole = requiredRoles.some(
      (role) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role],
    );

    if (!hasRole) {
      logAudit({
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
        entityType: "ServerAction",
        entityId: "guard",
        performedBy: userId,
        details: {
          requiredRole: options.requiredRole,
          actualRole: userRole,
        },
      });
      throw new Error("Nemáte oprávnění k této akci");
    }
  }

  // 3. Rate limit (Redis-backed for cross-instance consistency)
  if (!options.skipRateLimit) {
    const limiter = options.sensitive ? SENSITIVE_ACTION_LIMITER : ACTION_LIMITER;
    const key = `${options.rateLimitPrefix || "action"}-${userId}`;
    const check = await checkRateLimitAsync(limiter, key);

    if (!check.allowed) {
      const minutes = Math.ceil(check.resetInMs / 60_000);
      throw new Error(
        `Příliš mnoho požadavků. Zkuste to znovu za ${minutes} min.`,
      );
    }
  }

  // 4. Get client IP
  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  return { userId, userRole, userName, ip };
}

/**
 * Validate that FormData string values don't contain suspicious content.
 * Returns the first suspicious field name, or null if clean.
 */
export async function checkFormDataSecurity(
  formData: FormData,
  fieldsToCheck: string[],
): Promise<string | null> {
  for (const field of fieldsToCheck) {
    const value = formData.get(field);
    if (typeof value === "string" && containsSuspiciousContent(value)) {
      const session = await auth();
      logAudit({
        action: "SUSPICIOUS_INPUT_DETECTED",
        entityType: "FormData",
        entityId: field,
        performedBy: session?.user?.id || "anonymous",
        details: {
          field,
          // Don't log the actual suspicious content — just that it was detected
          length: value.length,
        },
      });
      return field;
    }
  }
  return null;
}
