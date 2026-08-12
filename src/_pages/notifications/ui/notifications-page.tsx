import type { Metadata } from "next";
import { notificationFiltersSchema } from "@/entities/notification";
import { getNotifications } from "@/entities/notification/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
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
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <ProductPageIntro
        description="티켓 지급과 보컬 분석, AI 믹싱 작업의 중요한 결과를 확인하세요."
        eyebrow="Notifications"
        title="알림"
      />
      <div className="mt-8">
        <NotificationsList initial={initial} />
      </div>
    </div>
  );
}
