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
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-8 pb-9">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
            Vocal profiles
          </p>
          <h1 className="mt-2.5 max-w-3xl text-[clamp(2rem,4vw,3.5rem)] leading-[1.04] font-semibold tracking-[-0.045em] text-balance">
            내 보컬 프로필
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
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
