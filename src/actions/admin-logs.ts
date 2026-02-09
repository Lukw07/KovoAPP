"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import bcrypt from "bcrypt";

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Přístup odepřen");
  }
  return session;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditLogFilters {
  search?: string;
  action?: string;
  entityType?: string;
  performedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

export interface SecurityEventFilters {
  search?: string;
  type?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

// ─── Get Audit Logs ──────────────────────────────────────────────────────────

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  await requireAdmin();

  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;
  const skip = (page - 1) * perPage;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }

  if (filters.performedBy) {
    where.performedBy = filters.performedBy;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo + "T23:59:59") } : {}),
    };
  }

  if (filters.search) {
    const searchTerm = filters.search;
    where.OR = [
      { action: { contains: searchTerm, mode: "insensitive" } },
      { entityType: { contains: searchTerm, mode: "insensitive" } },
      { entityId: { contains: searchTerm, mode: "insensitive" } },
      { performedBy: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.auditLog.count({ where: where as never }),
  ]);

  // Enrich with user names
  const userIds = [...new Set(logs.map((l) => l.performedBy))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const enrichedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    details: log.details as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
    performedBy: log.performedBy,
    performer: userMap.get(log.performedBy) ?? {
      id: log.performedBy,
      name: "Neznámý",
      email: "",
      avatarUrl: null,
    },
  }));

  return {
    logs: enrichedLogs,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ─── Get Unique Filter Options ───────────────────────────────────────────────

export async function getAuditLogFilterOptions() {
  await requireAdmin();

  const [actions, entityTypes, performers] = await Promise.all([
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["performedBy"],
      select: { performedBy: true },
    }),
  ]);

  // Get performer names
  const performerIds = performers.map((p) => p.performedBy);
  const users = await prisma.user.findMany({
    where: { id: { in: performerIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return {
    actions: actions.map((a) => a.action),
    entityTypes: entityTypes.map((e) => e.entityType),
    performers: users.map((u) => ({ id: u.id, name: u.name })),
  };
}

// ─── Get Security Events ─────────────────────────────────────────────────────

export async function getSecurityEvents(filters: SecurityEventFilters = {}) {
  await requireAdmin();

  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.severity) {
    where.severity = filters.severity;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo + "T23:59:59") } : {}),
    };
  }

  if (filters.search) {
    const searchTerm = filters.search;
    where.OR = [
      { type: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
      { ipAddress: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  const [events, total] = await Promise.all([
    prisma.securityEvent.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.securityEvent.count({ where: where as never }),
  ]);

  // Enrich with user names where userId exists
  const userIds = events.map((e) => e.userId).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const enrichedEvents = events.map((event) => ({
    id: event.id,
    type: event.type,
    severity: event.severity,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    userId: event.userId,
    email: event.email,
    details: event.details as Record<string, unknown> | null,
    createdAt: event.createdAt,
    user: event.userId ? (userMap.get(event.userId) ?? null) : null,
  }));

  return {
    events: enrichedEvents,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ─── Get Security Event Filter Options ───────────────────────────────────────

export async function getSecurityEventFilterOptions() {
  await requireAdmin();

  const [types, severities] = await Promise.all([
    prisma.securityEvent.findMany({
      distinct: ["type"],
      select: { type: true },
      orderBy: { type: "asc" },
    }),
    prisma.securityEvent.findMany({
      distinct: ["severity"],
      select: { severity: true },
      orderBy: { severity: "asc" },
    }),
  ]);

  return {
    types: types.map((t) => t.type),
    severities: severities.map((s) => s.severity),
  };
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getAuditStats() {
  await requireAdmin();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const [
    totalAuditLogs,
    todayAuditLogs,
    weekAuditLogs,
    totalSecurityEvents,
    criticalEvents,
    warningEvents,
    todaySecurityEvents,
    recentFailedLogins,
  ] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.securityEvent.count(),
    prisma.securityEvent.count({
      where: { severity: "CRITICAL", createdAt: { gte: monthAgo } },
    }),
    prisma.securityEvent.count({
      where: { severity: "WARNING", createdAt: { gte: monthAgo } },
    }),
    prisma.securityEvent.count({ where: { createdAt: { gte: today } } }),
    prisma.securityEvent.count({
      where: { type: "LOGIN_FAILED", createdAt: { gte: weekAgo } },
    }),
  ]);

  return {
    totalAuditLogs,
    todayAuditLogs,
    weekAuditLogs,
    totalSecurityEvents,
    criticalEvents,
    warningEvents,
    todaySecurityEvents,
    recentFailedLogins,
  };
}

// ─── Clear Old Audit Logs ────────────────────────────────────────────────────

export async function clearOldAuditLogs(daysToKeep: number = 90) {
  const session = await requireAdmin();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const deleted = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });

  await logAudit({
    action: "AUDIT_LOGS_CLEARED",
    entityType: "AuditLog",
    entityId: "bulk",
    performedBy: session.user!.id!,
    details: { daysKept: daysToKeep, deletedCount: deleted.count },
  });

  return { success: true, deletedCount: deleted.count };
}

// ─── Clear Old Security Events ───────────────────────────────────────────────

export async function clearOldSecurityEvents(daysToKeep: number = 90) {
  const session = await requireAdmin();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const deleted = await prisma.securityEvent.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });

  await logAudit({
    action: "SECURITY_EVENTS_CLEARED",
    entityType: "SecurityEvent",
    entityId: "bulk",
    performedBy: session.user!.id!,
    details: { daysKept: daysToKeep, deletedCount: deleted.count },
  });

  return { success: true, deletedCount: deleted.count };
}

// ─── Export Audit Logs ───────────────────────────────────────────────────────

export async function exportAuditLogs(filters: AuditLogFilters = {}) {
  await requireAdmin();

  // Get all matching logs (no pagination)
  const where: Record<string, unknown> = {};

  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.performedBy) where.performedBy = filters.performedBy;

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo + "T23:59:59") } : {}),
    };
  }

  const logs = await prisma.auditLog.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 10000, // Safety limit
  });

  // Enrich with user names
  const userIds = [...new Set(logs.map((l) => l.performedBy))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return logs.map((log) => ({
    datum: log.createdAt.toISOString(),
    akce: log.action,
    typEntity: log.entityType,
    entityId: log.entityId,
    provedl: userMap.get(log.performedBy)?.name ?? log.performedBy,
    email: userMap.get(log.performedBy)?.email ?? "",
    ipAdresa: log.ipAddress ?? "",
    detaily: log.details ? JSON.stringify(log.details) : "",
  }));
}
