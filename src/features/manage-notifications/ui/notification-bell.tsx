"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationItemContent } from "@/entities/notification";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  markAllNotificationsReadMutationOptions,
  markNotificationReadMutationOptions,
  notificationListQueryOptions,
} from "../api/client";

function unreadLabel(count: number) {
  return count > 0 ? `알림, 읽지 않은 알림 ${count}개` : "알림";
}

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const list = useQuery(notificationListQueryOptions({ page: 1, pageSize: 5, unreadOnly: true }));
  const read = useMutation(markNotificationReadMutationOptions(queryClient));
  const readAll = useMutation(markAllNotificationsReadMutationOptions(queryClient));
  const unreadCount = list.data?.unreadCount ?? 0;

  async function openNotification(id: string, href: string) {
    try {
      await read.mutateAsync(id);
    } finally {
      router.push(href);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label={unreadLabel(unreadCount)} className="relative rounded-full" size="icon" variant="ghost" />
        }
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-data-accent px-1 text-[10px] font-semibold leading-[1.125rem] text-white ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(23rem,calc(100vw-2rem))] p-1.5" side="bottom" sideOffset={8}>
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <p className="text-sm font-semibold text-foreground">알림</p>
          <Button
            className="h-8 px-2 text-xs"
            disabled={unreadCount === 0 || readAll.isPending}
            onClick={() => readAll.mutate()}
            size="xs"
            variant="ghost"
          >
            <CheckCheck aria-hidden="true" /> 모두 읽음
          </Button>
        </div>
        <DropdownMenuSeparator />
        {list.isPending ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">알림을 불러오는 중…</p>
        ) : null}
        {list.isError ? (
          <p className="px-3 py-8 text-center text-xs text-destructive">알림을 불러오지 못했어요.</p>
        ) : null}
        {list.data?.notifications.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">새 알림이 없어요.</p>
        ) : null}
        {list.data?.notifications.map((item) => (
          <DropdownMenuItem
            className="items-start px-2 py-2.5"
            disabled={read.isPending && read.variables === item.id}
            key={item.id}
            onClick={() => void openNotification(item.id, item.href)}
          >
            <NotificationItemContent compact item={item} />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center py-2 text-xs font-medium"
          nativeButton={false}
          render={<Link href="/notifications" />}
        >
          전체 알림 보기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
