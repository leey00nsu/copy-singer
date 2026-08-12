import { ShieldCheck, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { type TicketEntryView, TicketLedger } from "@/entities/ticket";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";

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
      <ProductPageIntro
        description="로그인 계정과 사용 가능한 티켓, 변경 내역을 확인하세요."
        eyebrow="Account"
        title="내 계정"
      />

      <section
        aria-label="계정과 티켓 요약"
        className="mt-10 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]"
      >
        <div className="rounded-3xl bg-muted/25 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
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
          <dl className="mt-7 grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <UserRound aria-hidden="true" className="size-3" /> 이름
              </dt>
              <dd className="mt-1.5 break-words text-sm font-semibold">{user.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">이메일</dt>
              <dd className="mt-1.5 break-all text-sm font-semibold">{user.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">로그인 방식</dt>
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
          <div>
            <h2 className="text-5xl font-semibold tracking-[-0.055em] tabular-nums" id="ticket-balance-title">
              {account.balance}개
            </h2>
            <p className="mt-2 text-xs leading-5 text-background/60">AI 믹싱을 시작할 때 티켓 1개를 사용합니다.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="ticket-ledger-title" className="mt-12">
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
