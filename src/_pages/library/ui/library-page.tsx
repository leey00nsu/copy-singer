import { Plus } from "lucide-react";
import Link from "next/link";
import { getMixingHistory } from "@/entities/mixing-job/index.server";
import { getVocalProfileHistory } from "@/entities/vocal-profile/index.server";
import { analysisJobPayload, listVisibleVocalProfileAnalysisJobs } from "@/features/analyze-vocal-profile/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { buttonVariants } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
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
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <ProductPageIntro
        aside={
          <Link className={buttonVariants({ size: "sm" })} href="/profile">
            <Plus aria-hidden="true" className="size-4" /> 새 목소리 분석
          </Link>
        }
        description="저장한 보컬 프로필과 AI 믹싱 작업을 구분해 확인하세요. 진행 중인 작업은 페이지를 닫아도 계속됩니다."
        eyebrow="Library"
        title="내 라이브러리"
      />
      <div className="mt-7">
        <LibraryTabs tab={filters.tab} />
      </div>
      <div className="mt-4">{content}</div>
    </div>
  );
}
