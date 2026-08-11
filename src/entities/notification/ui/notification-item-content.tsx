import { AudioLines, CircleAlert, Ticket, WandSparkles } from "lucide-react";
import type { NotificationItem } from "../model/contract";

const icons = {
  ticket_credit: Ticket,
  vocal_profile_succeeded: AudioLines,
  vocal_profile_failed: CircleAlert,
  mixing_succeeded: WandSparkles,
  mixing_failed: CircleAlert,
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function NotificationItemContent({ compact = false, item }: { compact?: boolean; item: NotificationItem }) {
  const Icon = icons[item.type];
  const unread = item.readAt === null;
  return (
    <span className="flex min-w-0 items-start gap-3 text-left">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-sm font-semibold leading-5 text-foreground">{item.title}</span>
          {unread ? (
            <>
              <span className="sr-only">읽지 않음</span>
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-data-accent" />
            </>
          ) : null}
        </span>
        <span className={`mt-0.5 block text-xs leading-5 text-muted-foreground ${compact ? "line-clamp-2" : ""}`}>
          {item.message}
        </span>
        <time className="mt-1 block text-[11px] text-muted-foreground" dateTime={item.createdAt}>
          {dateTimeFormatter.format(new Date(item.createdAt))}
        </time>
      </span>
    </span>
  );
}
