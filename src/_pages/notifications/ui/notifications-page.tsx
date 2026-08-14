import type { Metadata } from "next";
import { notificationFiltersSchema } from "@/entities/notification";
import { getNotifications } from "@/entities/notification/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { NotificationsList } from "./notifications-list";
import { NotificationsPageContent } from "./notifications-page-content";

export const metadata: Metadata = {
  title: "알림 — Copysinger",
  description: "보컬 분석, AI 믹싱과 티켓 지급 알림을 확인할 수 있어요.",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePageSession("/notifications");
  const filters = notificationFiltersSchema.parse({ ...(await searchParams), pageSize: 20 });
  const initial = await getNotifications(session.user.id, filters.page, filters.pageSize);

  return (
    <NotificationsPageContent>
      <NotificationsList initial={initial} />
    </NotificationsPageContent>
  );
}
