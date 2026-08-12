import { ShieldCheck, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { type TicketEntryView, TicketLedger } from "@/entities/ticket";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";

export type AccountOverviewProps = {
  account: {
    balance: number;
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
  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">Account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[2rem]">내 계정</h1>
        <p className="mt-2.5 max-w-2xl text-xs leading-5 text-muted-foreground">
          로그인 계정과 사용 가능한 티켓, 변경 내역을 확인하세요.
        </p>
      </header>

      <section aria-labelledby="account-information-title" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" id="account-information-title">
              계정 정보
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">현재 로그인한 사용자와 실제 연결 공급자입니다.</p>
          </div>
          <Badge className="text-[11px]" variant={authentication.googleConnected ? "outline" : "secondary"}>
            <ShieldCheck aria-hidden="true" className="size-3" />
            {authentication.googleConnected ? "Google 연결됨" : "Google 연결 정보 없음"}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-px border-y bg-border md:grid-cols-3">
          <div className="bg-background px-4 py-4 sm:px-5">
            <dt className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <UserRound aria-hidden="true" className="size-3" /> 이름
            </dt>
            <dd className="mt-1.5 break-words text-xs font-semibold">{user.name}</dd>
          </div>
          <div className="bg-background px-4 py-4 sm:px-5">
            <dt className="text-[11px] text-muted-foreground">이메일</dt>
            <dd className="mt-1.5 break-all text-xs font-semibold">{user.email}</dd>
          </div>
          <div className="bg-background px-4 py-4 sm:px-5">
            <dt className="text-[11px] text-muted-foreground">로그인 방식</dt>
            <dd className="mt-1.5 text-xs font-semibold">{authentication.googleConnected ? "Google" : "현재 세션"}</dd>
            {authentication.googleConnectedAt ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {authentication.googleConnectedAt.toLocaleDateString("ko-KR")} 연결
              </p>
            ) : null}
          </div>
        </dl>
      </section>

      <section aria-labelledby="ticket-balance-title" className="mt-8 py-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Ticket aria-hidden="true" className="size-3.5" /> 사용 가능한 티켓
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-[-0.04em] tabular-nums" id="ticket-balance-title">
          {account.balance}개
        </h2>
      </section>

      <section aria-labelledby="ticket-ledger-title" className="mt-9">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold" id="ticket-ledger-title">
              티켓 변경 내역
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              지급, AI 믹싱 사용, 자동 환불과 관리자 조정을 시간순으로 표시합니다.
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
