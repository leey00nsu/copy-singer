import { LogIn, Mail, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { type TicketEntryView, TicketLedger } from "@/entities/ticket";
import { type TicketWallet, ticketBalanceForKind } from "@/entities/ticket/index.model";
import { Button, buttonVariants } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";

export type AccountOverviewProps = {
  account: {
    wallets: TicketWallet[];
    entries: TicketEntryView[];
    page: number;
    pageCount: number;
    total: number;
  };
  admin?: boolean;
  authentication: {
    googleConnected: boolean;
    googleConnectedAt: Date | null;
  };
  user: {
    email: string;
    name: string;
  };
};

function PaginationAction({
  direction,
  disabled,
  href,
}: {
  direction: "이전" | "다음";
  disabled: boolean;
  href: string;
}) {
  return disabled ? (
    <Button disabled size="sm" variant="outline">
      {direction}
    </Button>
  ) : (
    <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={href}>
      {direction}
    </Link>
  );
}

export function AccountOverview({ account, authentication, user }: AccountOverviewProps) {
  const analysisBalance = ticketBalanceForKind(account.wallets, "VOCAL_ANALYSIS");
  const mixingBalance = ticketBalanceForKind(account.wallets, "AI_MIXING");

  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <ProductPageIntro
        description="로그인 계정과 사용 가능한 티켓, 변경 내역을 확인할 수 있어요."
        eyebrow="Account"
        title="내 계정"
      />

      <section
        aria-label="계정과 티켓 요약"
        className="mt-10 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]"
      >
        <div className="rounded-3xl bg-muted/55 p-6 sm:p-7">
          <div>
            <h2 className="text-base font-semibold" id="account-information-title">
              계정 정보
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">현재 로그인한 계정 정보를 보여줘요.</p>
          </div>
          <dl className="mt-7 grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <UserRound aria-hidden="true" className="size-3" /> 이름
              </dt>
              <dd className="mt-1.5 break-words text-sm font-semibold">{user.name}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Mail aria-hidden="true" className="size-3" /> 이메일
              </dt>
              <dd className="mt-1.5 break-all text-sm font-semibold">{user.email}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <LogIn aria-hidden="true" className="size-3" /> 로그인 방식
              </dt>
              <dd className="mt-1.5 text-sm font-semibold">
                {authentication.googleConnected ? "Google" : "현재 세션"}
              </dd>
              {authentication.googleConnectedAt ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {authentication.googleConnectedAt.toLocaleDateString("ko-KR")} 연결
                </p>
              ) : null}
            </div>
          </dl>
        </div>
        <div className="flex min-h-52 flex-col justify-between rounded-3xl bg-foreground p-6 text-background sm:p-7">
          <p className="flex items-center gap-2 text-sm text-background/70">
            <Ticket aria-hidden="true" className="size-4" /> 사용 가능한 티켓
          </p>
          <dl className="grid grid-cols-2 gap-5">
            <div>
              <dt className="text-xs text-background/60">분석 티켓</dt>
              <dd className="mt-1 text-4xl font-semibold tracking-[-0.05em] tabular-nums" id="analysis-ticket-balance">
                {analysisBalance}장
              </dd>
            </div>
            <div>
              <dt className="text-xs text-background/60">믹싱 티켓</dt>
              <dd className="mt-1 text-4xl font-semibold tracking-[-0.05em] tabular-nums" id="mixing-ticket-balance">
                {mixingBalance}장
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-background/60">목소리 분석과 AI 믹싱에 각각 사용하는 티켓이에요.</p>
        </div>
      </section>

      <section aria-labelledby="ticket-ledger-title" className="mt-12">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" id="ticket-ledger-title">
              티켓 변경 내역
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              분석·믹싱 티켓의 지급, 사용, 환불과 관리자 조정 내역을 시간순으로 보여줘요.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">총 {account.total}건</p>
        </div>
        <TicketLedger entries={account.entries} />
        {account.total > 0 ? (
          <nav aria-label="티켓 내역 페이지" className="mt-5 flex items-center justify-center gap-3">
            <PaginationAction
              direction="이전"
              disabled={account.page <= 1}
              href={`/account?page=${account.page - 1}`}
            />
            <span className="min-w-14 text-center text-xs text-muted-foreground" aria-live="polite">
              {account.page} / {account.pageCount}
            </span>
            <PaginationAction
              direction="다음"
              disabled={account.page >= account.pageCount}
              href={`/account?page=${account.page + 1}`}
            />
          </nav>
        ) : null}
      </section>
    </div>
  );
}
