import "server-only";

import type { Prisma, NotificationType as StoredNotificationType } from "@/shared/db/index.server";
import { prisma } from "@/shared/db/index.server";
import type { NotificationItem, NotificationList, NotificationType } from "../model/contract";

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  href: true,
  sourceId: true,
  readAt: true,
  createdAt: true,
} as const;

type NotificationDatabase = Prisma.TransactionClient | typeof prisma;

type CreateNotificationInput = {
  userId: string;
  type: StoredNotificationType;
  title: string;
  message: string;
  href: string;
  sourceId?: string | null;
  dedupeKey: string;
};

function normalizeText(value: string, field: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`Notification ${field} must be between 1 and ${maxLength} characters.`);
  }
  return normalized;
}

function normalizeHref(value: string) {
  const normalized = value.trim();
  if (!/^\/(?!\/)/.test(normalized) || normalized.length > 500) {
    throw new Error("Notification href must be a relative internal path.");
  }
  return normalized;
}

function serializeNotification(row: {
  id: string;
  type: StoredNotificationType;
  title: string;
  message: string;
  href: string;
  sourceId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type.toLowerCase() as NotificationType,
    title: row.title,
    message: row.message,
    href: row.href,
    sourceId: row.sourceId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createNotification(input: CreateNotificationInput, database: NotificationDatabase = prisma) {
  const normalized = {
    title: normalizeText(input.title, "title", 120),
    message: normalizeText(input.message, "message", 500),
    href: normalizeHref(input.href),
    sourceId: input.sourceId?.trim() || null,
    dedupeKey: normalizeText(input.dedupeKey, "dedupeKey", 200),
  };
  if (normalized.sourceId && normalized.sourceId.length > 100) {
    throw new Error("Notification sourceId must not exceed 100 characters.");
  }

  await database.notification.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        userId: input.userId,
        type: input.type,
        ...normalized,
      },
    ],
    skipDuplicates: true,
  });
  const row = await database.notification.findUniqueOrThrow({
    where: { dedupeKey: normalized.dedupeKey },
    select: { ...notificationSelect, userId: true, dedupeKey: true },
  });
  if (
    row.userId !== input.userId ||
    row.type !== input.type ||
    row.title !== normalized.title ||
    row.message !== normalized.message ||
    row.href !== normalized.href ||
    row.sourceId !== normalized.sourceId ||
    row.dedupeKey !== normalized.dedupeKey
  ) {
    throw new Error("Notification dedupe key was reused with different input.");
  }
  return serializeNotification(row);
}

export async function getNotifications(userId: string, page = 1, pageSize = 20): Promise<NotificationList> {
  const requestedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(50, Math.max(1, Math.trunc(pageSize)));
  const where = { userId } satisfies Prisma.NotificationWhereInput;
  const [total, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / normalizedPageSize));
  const normalizedPage = Math.min(requestedPage, pageCount);
  const rows = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (normalizedPage - 1) * normalizedPageSize,
    take: normalizedPageSize,
    select: notificationSelect,
  });
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    pageCount,
    unreadCount,
    notifications: rows.map(serializeNotification),
  };
}

export async function markNotificationRead(userId: string, id: string) {
  const now = new Date();
  await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: now } });
  const row = await prisma.notification.findFirst({ where: { id, userId }, select: notificationSelect });
  return row ? serializeNotification(row) : null;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updatedCount: result.count, unreadCount: 0 as const };
}
