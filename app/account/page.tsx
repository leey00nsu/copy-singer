import Link from "next/link";
import { AudioLines, ChevronLeft, ChevronRight, Ticket, UserRound } from "lucide-react";
import { TicketLedger } from "@/components/account/ticket-ledger";
import { Button } from "@/components/ui/button";
import { requirePageSession } from "@/lib/auth/session";
import { getTicketAccount } from "@/lib/tickets/service";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requirePageSession("/account");
  const requestedPage = Number((await searchParams).page ?? "1");
  const account = await getTicketAccount(session.user.id, Number.isFinite(requestedPage) ? requestedPage : 1);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-16 sm:px-8">
      <p className="text-sm font-semibold text-emerald-700">MY ACCOUNT</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">내 계정</h1>
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-background p-5">
          <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="mt-5 text-lg font-semibold">{session.user.name}</p>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <div className="rounded-2xl border bg-emerald-950 p-5 text-white">
          <Ticket className="size-5 text-emerald-300" aria-hidden="true" />
          <p className="mt-5 text-sm text-emerald-100">사용 가능한 티켓</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{account.balance}</p>
        </div>
      </section>

      <Link className="mt-5 flex items-center justify-between rounded-2xl border bg-background p-5 transition-colors hover:bg-muted/40" href="/vocal-profiles">
        <span className="flex items-center gap-3"><AudioLines className="size-5 text-emerald-600" aria-hidden="true" /><span><span className="block font-semibold">내 보컬 프로필</span><span className="mt-1 block text-sm text-muted-foreground">저장된 분석과 제출한 보컬 다시 보기</span></span></span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </Link>

      <div className="mb-4 mt-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">티켓 사용 내역</h2>
          <p className="mt-1 text-sm text-muted-foreground">지급, AI 믹싱, 환불과 관리자 조정을 모두 확인할 수 있어요.</p>
        </div>
        <p className="text-xs text-muted-foreground">총 {account.total}건</p>
      </div>
      <TicketLedger entries={account.entries} />
      <nav className="mt-5 flex items-center justify-center gap-2" aria-label="티켓 내역 페이지">
        <Button variant="outline" disabled={account.page <= 1} render={<Link href={`/account?page=${account.page - 1}`} />}>
          <ChevronLeft aria-hidden="true" /> 이전
        </Button>
        <span className="px-3 text-sm text-muted-foreground">{account.page} / {account.pageCount}</span>
        <Button variant="outline" disabled={account.page >= account.pageCount} render={<Link href={`/account?page=${account.page + 1}`} />}>
          다음 <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </main>
  );
}
