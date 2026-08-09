import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { VocalProfileHistoryList } from "@/components/vocal-profile/vocal-profile-history-list";
import { getVocalProfileHistory } from "@/entities/vocal-profile/index.server";
import { analysisJobPayload, listVisibleVocalProfileAnalysisJobs } from "@/features/analyze-vocal-profile/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { Button, buttonVariants } from "@/shared/ui/button";

export default async function VocalProfilesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requirePageSession("/vocal-profiles");
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isFinite(requestedPage) ? requestedPage : 1;
  const [history, analysisJobRows] = await Promise.all([
    getVocalProfileHistory(session.user.id, page),
    listVisibleVocalProfileAnalysisJobs(session.user.id),
  ]);
  const analysisJobs = analysisJobRows.map(analysisJobPayload);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-emerald-700">VOCAL PROFILES</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">내 보컬 프로필</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            저장된 분석을 다시 보고, 제출했던 보컬을 안전하게 들어보세요.
          </p>
        </div>
        <Link className={buttonVariants()} href="/profile">
          <Plus className="size-4" /> 새 프로필 만들기
        </Link>
      </div>
      <div className="mt-8">
        <VocalProfileHistoryList history={history} analysisJobs={analysisJobs} />
      </div>
      <nav className="mt-6 flex items-center justify-center gap-2" aria-label="보컬 프로필 페이지">
        <Button
          nativeButton={false}
          variant="outline"
          disabled={history.page <= 1}
          render={<Link href={`/vocal-profiles?page=${history.page - 1}`} />}
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
          render={<Link href={`/vocal-profiles?page=${history.page + 1}`} />}
        >
          다음 <ChevronRight />
        </Button>
      </nav>
    </main>
  );
}
