import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// ============================================================================
// Audit Logging — tracks all sensitive admin/system operations
// ============================================================================

interface AuditParams {
  action: string; // e.g., "HR_REQUEST_APPROVED", "POINTS_AWARDED", "USER_CREATED"
  entityType: string; // e.g., "HrRequest", "PointTransaction", "User"
  entityId: string;
  performedBy: string; // userId of actor
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an audit entry for tracking admin/sensitive operations.
 * Non-blocking — errors are caught and logged but never thrown.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        performedBy: params.performedBy,
        details: (params.details as Prisma.InputJsonValue) ?? undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error("[AUDIT] Failed to write audit log:", err);
  }
}
