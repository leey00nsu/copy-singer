import { ArrowDownRight, ArrowUpRight, Ticket } from "lucide-react";
import Link from "next/link";
import { StatePanel } from "@/shared/ui/state-panel";

export type TicketEntryView = {
  id: string;
  type: "SIGNUP_GRANT" | "MIXING_DEBIT" | "MIXING_REFUND" | "ADMIN_ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  reason: string;
  mixingJobId?: string | null;
  createdAt: Date;
};

const TYPE_LABELS: Record<TicketEntryView["type"], string> = {
  SIGNUP_GRANT: "가입 지급",
  MIXING_DEBIT: "AI 믹싱",
  MIXING_REFUND: "자동 환불",
  ADMIN_ADJUSTMENT: "관리자 조정",
};

export function TicketLedger({ entries }: { entries: TicketEntryView[] }) {
  if (entries.length === 0) {
    return (
      <StatePanel
        description="티켓을 지급받거나 사용하면 이곳에 기록됩니다."
        icon={<Ticket />}
        title="티켓 내역이 없습니다."
      />
    );
  }
  return (
    <div className="divide-y bg-background">
      {entries.map((entry) => {
        const credit = entry.amount > 0;
        return (
          <article
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 py-3 sm:px-3"
            data-ticket-direction={credit ? "credit" : "debit"}
            key={entry.id}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${credit ? "bg-success/45 text-success-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {credit ? (
                <ArrowUpRight aria-hidden="true" className="size-4" />
              ) : (
                <ArrowDownRight aria-hidden="true" className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-medium">{TYPE_LABELS[entry.type]}</p>
                <span className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString("ko-KR")}</span>
              </div>
              <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">{entry.reason}</p>
              {entry.mixingJobId ? (
                <Link
                  className="mt-1 inline-block text-xs font-medium underline underline-offset-4"
                  href={`/library/mixes/${entry.mixingJobId}`}
                >
                  AI 믹스 상세 보기
                </Link>
              ) : null}
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold tabular-nums ${credit ? "text-success-foreground" : "text-foreground"}`}
              >
                {credit ? "+" : ""}
                {entry.amount}
              </p>
              <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Ticket className="size-3" aria-hidden="true" /> {entry.balanceAfter}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
