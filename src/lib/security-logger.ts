import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// ============================================================================
// Security Event Logger — tracks security-relevant events for monitoring
// ============================================================================

type SecuritySeverity = "INFO" | "WARNING" | "CRITICAL";

interface SecurityEventParams {
  type: string; // LOGIN_FAILED, LOGIN_SUCCESS, ACCOUNT_LOCKED, SUSPICIOUS_INPUT, BRUTE_FORCE, etc.
  severity?: SecuritySeverity;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  details?: Record<string, unknown>;
}

/**
 * Log a security event. Non-blocking — errors are caught silently.
 */
export async function logSecurityEvent(
  params: SecurityEventParams,
): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        type: params.type,
        severity: params.severity || "INFO",
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        userId: params.userId ?? null,
        email: params.email ?? null,
        details: (params.details as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (err) {
    console.error("[SECURITY] Failed to log security event:", err);
  }
}

/**
 * Log a failed login attempt with severity escalation.
 */
export async function logFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  // Count recent failures for this email
  const recentFailures = await prisma.securityEvent
    .count({
      where: {
        type: "LOGIN_FAILED",
        email,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 min
      },
    })
    .catch(() => 0);

  const severity: SecuritySeverity =
    recentFailures >= 10
      ? "CRITICAL"
      : recentFailures >= 5
        ? "WARNING"
        : "INFO";

  await logSecurityEvent({
    type: "LOGIN_FAILED",
    severity,
    email,
    ipAddress,
    userAgent,
    details: { recentFailures: recentFailures + 1 },
  });
}

/**
 * Clean up old security events (retention: 90 days).
 * Call this from a cron job periodically.
 */
export async function cleanupSecurityEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const result = await prisma.securityEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count;
}
