import { getMixingHistory } from "@/entities/mixing-job/index.server";
import { getVocalProfileHistory } from "@/entities/vocal-profile/index.server";
import { analysisJobPayload, listVisibleVocalProfileAnalysisJobs } from "@/features/analyze-vocal-profile/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { MixingLibrary, parseLibrarySearchParams, VocalProfileLibrary } from "@/widgets/library";
import { LibraryPageContent } from "./library-page-content";

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
          <VocalProfileLibrary analysisJobs={jobs.map(analysisJobPayload)} history={history} />
        ))
      : await getMixingHistory(session.user.id, filters).then((history) => (
          <MixingLibrary filters={filters} initial={history} />
        ));

  return <LibraryPageContent tab={filters.tab}>{content}</LibraryPageContent>;
}
