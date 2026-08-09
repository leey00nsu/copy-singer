import { Plus } from "lucide-react";
import Link from "next/link";
import { getMixingHistory } from "@/entities/mixing-job/index.server";
import { getVocalProfileHistory } from "@/entities/vocal-profile/index.server";
import { analysisJobPayload, listVisibleVocalProfileAnalysisJobs } from "@/features/analyze-vocal-profile/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { buttonVariants } from "@/shared/ui/button";
import { LibraryTabs, MixingLibrary, parseLibrarySearchParams, VocalProfileLibrary } from "@/widgets/library";

type LibraryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const session = await requirePageSession("/library");
  const filters = parseLibrarySearchParams(await searchParams);

  const content =
    filters.tab === "profiles"
      ? await Promise.all([
          getVocalProfileHistory(session.user.id, filters.page),
          listVisibleVocalProfileAnalysisJobs(session.user.id),
        ]).then(([history, jobs]) => (
          <VocalProfileLibrary analysisJobs={jobs.map(analysisJobPayload)} basePath="/library" history={history} />
        ))
      : await getMixingHistory(session.user.id, filters).then((history) => (
          <MixingLibrary basePath="/library" filters={filters} initial={history} />
        ));

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">LIBRARY</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">내 라이브러리</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            저장한 보컬 프로필과 AI 믹싱 작업을 구분해 확인하세요. 진행 중인 작업은 페이지를 닫아도 계속됩니다.
          </p>
        </div>
        <Link className={buttonVariants()} href="/profile">
          <Plus aria-hidden="true" className="size-4" /> 새 목소리 분석
        </Link>
      </div>
      <div className="mt-8">
        <LibraryTabs tab={filters.tab} />
      </div>
      <div className="mt-6">{content}</div>
    </div>
  );
}
