import { ArrowDownRight, ArrowUpRight, Ticket } from "lucide-react";
import Link from "next/link";
import { StatePanel } from "@/shared/ui/state-panel";
import { type TicketKind, ticketKindLabel } from "../model/contract";

export type TicketEntryView = {
  id: string;
  kind: TicketKind;
  type: "SIGNUP_GRANT" | "USAGE_DEBIT" | "USAGE_REFUND" | "ADMIN_ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  reason: string;
  mixingJobId?: string | null;
  vocalProfileAnalysisJobId?: string | null;
  createdAt: Date;
};

const TYPE_LABELS: Record<TicketEntryView["type"], string> = {
  SIGNUP_GRANT: "가입 지급",
  USAGE_DEBIT: "사용",
  USAGE_REFUND: "자동 환불",
  ADMIN_ADJUSTMENT: "관리자 조정",
};

export function TicketLedger({ entries }: { entries: TicketEntryView[] }) {
  if (entries.length === 0) {
    return (
      <StatePanel
        description="티켓을 받거나 사용하면 내역이 여기에 표시돼요."
        icon={<Ticket />}
        title="아직 티켓 내역이 없어요."
      />
    );
  }
  return (
    <div
      className="divide-y divide-border/70 overflow-hidden rounded-2xl bg-muted/55 px-3 sm:px-4"
      data-ticket-ledger-surface
    >
      {entries.map((entry) => {
        const credit = entry.amount > 0;
        return (
          <article
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-0 py-3.5 sm:py-4"
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
                <p className="text-sm font-medium">{ticketKindLabel(entry.kind)}</p>
                <span className="text-xs text-muted-foreground">{TYPE_LABELS[entry.type]}</span>
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
                <Ticket className="size-3" aria-hidden="true" /> 잔액 {entry.balanceAfter}장
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
