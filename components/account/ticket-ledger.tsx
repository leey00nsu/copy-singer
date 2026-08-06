import { ArrowDownRight, ArrowUpRight, Ticket } from "lucide-react";

export type TicketEntryView = {
  id: string;
  type: "SIGNUP_GRANT" | "MIXING_DEBIT" | "MIXING_REFUND" | "ADMIN_ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  reason: string;
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
    return <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">티켓 내역이 없습니다.</p>;
  }
  return (
    <div className="divide-y rounded-2xl border bg-background">
      {entries.map((entry) => (
        <article key={entry.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${entry.amount >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
            {entry.amount >= 0 ? <ArrowUpRight aria-hidden="true" /> : <ArrowDownRight aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-medium">{TYPE_LABELS[entry.type]}</p>
              <span className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString("ko-KR")}</span>
            </div>
            <p className="truncate text-sm text-muted-foreground">{entry.reason}</p>
          </div>
          <div className="text-right">
            <p className={`font-semibold tabular-nums ${entry.amount >= 0 ? "text-emerald-700" : "text-orange-700"}`}>
              {entry.amount >= 0 ? "+" : ""}{entry.amount}
            </p>
            <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <Ticket className="size-3" aria-hidden="true" /> {entry.balanceAfter}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
