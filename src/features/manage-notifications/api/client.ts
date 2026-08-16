import { mutationOptions, type QueryClient, queryOptions } from "@tanstack/react-query";
import {
  type NotificationFilters,
  type NotificationList,
  type NotificationReadAllResponse,
  type NotificationReadResponse,
  notificationFiltersSchema,
  notificationListSchema,
  notificationReadAllResponseSchema,
  notificationReadResponseSchema,
} from "@/entities/notification";
import { requestJson } from "@/shared/api";

const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: Partial<NotificationFilters>) => [
    ...notificationKeys.lists(),
    notificationFiltersSchema.parse(filters),
  ],
} as const;

export function getNotificationList(filters: Partial<NotificationFilters>, signal?: AbortSignal) {
  const parsed = notificationFiltersSchema.parse(filters);
  const search = new URLSearchParams({
    page: String(parsed.page),
    pageSize: String(parsed.pageSize),
    unreadOnly: String(parsed.unreadOnly),
  });
  return requestJson(`/api/notifications?${search}`, {
    cache: "no-store",
    signal,
    schema: notificationListSchema,
  });
}

export function notificationListQueryOptions(filters: Partial<NotificationFilters>, initialData?: NotificationList) {
  const parsed = notificationFiltersSchema.parse(filters);
  return queryOptions({
    queryKey: notificationKeys.list(parsed),
    queryFn: ({ signal }) => getNotificationList(parsed, signal),
    ...(initialData ? { initialData } : {}),
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

export function markNotificationAsRead(id: string): Promise<NotificationReadResponse> {
  return requestJson(`/api/notifications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    schema: notificationReadResponseSchema,
  });
}

export function markNotificationReadMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ["notifications", "read"] as const,
    mutationFn: markNotificationAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function markAllNotificationsAsRead(): Promise<NotificationReadAllResponse> {
  return requestJson("/api/notifications/read-all", {
    method: "POST",
    schema: notificationReadAllResponseSchema,
  });
}

export function markAllNotificationsReadMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ["notifications", "read-all"] as const,
    mutationFn: markAllNotificationsAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}
