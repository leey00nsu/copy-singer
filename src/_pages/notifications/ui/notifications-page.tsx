import type { Metadata } from "next";
import { notificationFiltersSchema } from "@/entities/notification";
import { getNotifications } from "@/entities/notification/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { NotificationsList } from "./notifications-list";

export const metadata: Metadata = {
  title: "알림 — Copy Singer",
  description: "보컬 분석, AI 믹싱과 티켓 지급 알림을 확인하세요.",
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
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-7 lg:py-14">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">Notifications</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[2rem]">알림</h1>
      <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
        티켓 지급과 보컬 분석, AI 믹싱 작업의 중요한 결과를 확인하세요.
      </p>
      <div className="mt-8">
        <NotificationsList initial={initial} />
      </div>
    </div>
  );
}
