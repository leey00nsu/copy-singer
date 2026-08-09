import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getMixingHistory } from "@/entities/mixing-job/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { Button } from "@/shared/ui/button";
import { MixingHistoryList } from "./mixing-history-list";

export default async function MixingHistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requirePageSession("/mixing-history");
  const requestedPage = Number((await searchParams).page ?? "1");
  const history = await getMixingHistory(session.user.id, Number.isFinite(requestedPage) ? requestedPage : 1);
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-16 sm:px-8">
      <p className="text-sm font-semibold text-emerald-700">AI MIXING</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">믹싱 히스토리</h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
        페이지를 닫아도 작업은 서버에서 계속됩니다. 완료된 결과도 여기에서 다시 들을 수 있어요.
      </p>
      <MixingHistoryList initial={history} />
      <nav className="mt-6 flex items-center justify-center gap-2" aria-label="믹싱 히스토리 페이지">
        <Button
          nativeButton={false}
          variant="outline"
          disabled={history.page <= 1}
          render={<Link href={`/mixing-history?page=${history.page - 1}`} />}
        >
          <ChevronLeft /> 이전
        </Button>
        <span className="px-3 text-sm text-muted-foreground">
          {history.page} / {history.pageCount}
        </span>
        <Button
          nativeButton={false}
          variant="outline"
          disabled={history.page >= history.pageCount}
          render={<Link href={`/mixing-history?page=${history.page + 1}`} />}
        >
          다음 <ChevronRight />
        </Button>
      </nav>
    </main>
  );
}
