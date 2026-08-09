import { getMixingHistory, mixingHistoryFiltersSchema } from "@/entities/mixing-job/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { MixingLibrary } from "@/widgets/library";

export default async function MixingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePageSession("/mixing-history");
  const filters = mixingHistoryFiltersSchema.parse(await searchParams);
  const history = await getMixingHistory(session.user.id, filters);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">AI MIXING</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">믹싱 히스토리</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        페이지를 닫아도 작업은 서버에서 계속됩니다. 완료된 결과도 여기에서 다시 들을 수 있어요.
      </p>
      <div className="mt-8">
        <MixingLibrary filters={filters} initial={history} />
      </div>
    </div>
  );
}
