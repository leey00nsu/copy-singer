import { Plus } from "lucide-react";
import Link from "next/link";
import { getVocalProfileHistory } from "@/entities/vocal-profile/index.server";
import { analysisJobPayload, listVisibleVocalProfileAnalysisJobs } from "@/features/analyze-vocal-profile/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { buttonVariants } from "@/shared/ui/button";
import { VocalProfileLibrary } from "@/widgets/library";

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
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">VOCAL PROFILES</p>
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
        <VocalProfileLibrary history={history} analysisJobs={analysisJobs} />
      </div>
    </div>
  );
}
