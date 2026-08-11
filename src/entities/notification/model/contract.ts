import { z } from "zod";
import { pageSearchParamSchema } from "@/shared/api";

export const NOTIFICATION_TYPES = [
  "ticket_credit",
  "vocal_profile_succeeded",
  "vocal_profile_failed",
  "mixing_succeeded",
  "mixing_failed",
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

function firstSearchParam(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export const notificationFiltersSchema = z.object({
  page: z.preprocess(firstSearchParam, pageSearchParamSchema),
});

export const notificationSchema = z.object({
  id: z.uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(500),
  href: z
    .string()
    .regex(/^\/(?!\/)/)
    .max(500),
  sourceId: z.string().max(100).nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationListSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pageCount: z.number().int().positive(),
  unreadCount: z.number().int().nonnegative(),
  notifications: z.array(notificationSchema),
});

export const notificationReadResponseSchema = z.object({ notification: notificationSchema.nullable() });

export const notificationReadAllResponseSchema = z.object({
  updatedCount: z.number().int().nonnegative(),
  unreadCount: z.literal(0),
});

export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
export type NotificationFilters = z.infer<typeof notificationFiltersSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationReadResponse = z.infer<typeof notificationReadResponseSchema>;
export type NotificationReadAllResponse = z.infer<typeof notificationReadAllResponseSchema>;
