"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NotificationList as NotificationListPayload } from "@/entities/notification";
import { NotificationItemContent } from "@/entities/notification";
import {
  markAllNotificationsReadMutationOptions,
  markNotificationReadMutationOptions,
  notificationListQueryOptions,
} from "@/features/manage-notifications";
import { cn } from "@/shared/lib/cn";
import { Button, buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

export function NotificationsList({ initial }: { initial: NotificationListPayload }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const list = useQuery(notificationListQueryOptions({ page: initial.page, pageSize: initial.pageSize }, initial));
  const read = useMutation(markNotificationReadMutationOptions(queryClient));
  const readAll = useMutation(markAllNotificationsReadMutationOptions(queryClient));
  const data = list.data ?? initial;

  async function openNotification(id: string, href: string) {
    try {
      await read.mutateAsync(id);
    } finally {
      router.push(href);
    }
  }

  if (list.isError && !list.data) {
    return (
      <StatePanel
        description="잠시 뒤 다시 시도해 주세요. 저장된 알림은 그대로 유지됩니다."
        icon={<Bell />}
        role="alert"
        title="알림을 불러오지 못했습니다."
        tone="destructive"
      />
    );
  }

  if (data.total === 0) {
    return (
      <StatePanel
        description="보컬 분석과 AI 믹싱 결과가 준비되면 이곳에서 알려드릴게요."
        icon={<Bell />}
        title="아직 알림이 없습니다."
      />
    );
  }

  return (
    <section aria-label="알림 이력">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          전체 {data.total}개 · 읽지 않음 {data.unreadCount}개
        </p>
        <Button
          disabled={data.unreadCount === 0 || readAll.isPending}
          onClick={() => readAll.mutate()}
          size="sm"
          variant="outline"
        >
          <CheckCheck aria-hidden="true" /> 모두 읽음
        </Button>
      </div>
      <ul className="divide-y" aria-live="polite" data-row-list="notifications">
        {data.notifications.map((item) => (
          <li key={item.id}>
            <button
              className={cn(
                "block min-h-24 w-full px-3 py-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:px-4",
                item.readAt === null && "bg-muted/25",
              )}
              disabled={read.isPending && read.variables === item.id}
              onClick={() => void openNotification(item.id, item.href)}
              type="button"
            >
              <NotificationItemContent item={item} />
            </button>
          </li>
        ))}
      </ul>
      <nav aria-label="알림 페이지" className="mt-5 flex items-center justify-between gap-4">
        <Link
          aria-disabled={data.page <= 1}
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            data.page <= 1 && "pointer-events-none opacity-50",
          )}
          href={`/notifications?page=${Math.max(1, data.page - 1)}`}
        >
          이전
        </Link>
        <span className="text-xs text-muted-foreground">
          {data.page} / {data.pageCount}
        </span>
        <Link
          aria-disabled={data.page >= data.pageCount}
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            data.page >= data.pageCount && "pointer-events-none opacity-50",
          )}
          href={`/notifications?page=${Math.min(data.pageCount, data.page + 1)}`}
        >
          다음
        </Link>
      </nav>
    </section>
  );
}
