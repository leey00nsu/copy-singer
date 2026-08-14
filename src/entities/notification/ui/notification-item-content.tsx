import { AudioLines, CircleAlert, Ticket, WandSparkles } from "lucide-react";
import type { NotificationItem, NotificationType } from "../model/contract";

const icons: Record<
  NotificationType,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
> = {
  ticket_credit: Ticket,
  vocal_profile_succeeded: AudioLines,
  vocal_profile_failed: CircleAlert,
  mixing_succeeded: WandSparkles,
  mixing_failed: CircleAlert,
} as const;

const badgeStyles: Record<NotificationType, string> = {
  ticket_credit: "bg-success text-success-foreground",
  vocal_profile_succeeded: "bg-data-accent text-white",
  vocal_profile_failed: "bg-destructive/10 text-destructive",
  mixing_succeeded: "bg-data-accent text-white",
  mixing_failed: "bg-destructive/10 text-destructive",
} as const;

const badgeForegrounds: Record<NotificationType, string> = {
  ticket_credit: "var(--success-foreground)",
  vocal_profile_succeeded: "white",
  vocal_profile_failed: "var(--destructive)",
  mixing_succeeded: "white",
  mixing_failed: "var(--destructive)",
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function NotificationItemContent({ compact = false, item }: { compact?: boolean; item: NotificationItem }) {
  const Icon = icons[item.type];
  const badgeClass = badgeStyles[item.type] ?? "bg-muted text-foreground";
  const unread = item.readAt === null;
  return (
    <span className="flex min-w-0 items-start gap-3 text-left">
      <span
        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${badgeClass}`}
        data-notification-icon-badge={item.type}
        style={{ color: badgeForegrounds[item.type] }}
      >
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
