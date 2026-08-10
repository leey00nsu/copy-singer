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
    <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
      <header className="border-b pb-9">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">AI mixing</p>
        <h1 className="mt-2.5 max-w-3xl text-[clamp(2rem,4vw,3.5rem)] leading-[1.04] font-semibold tracking-[-0.045em] text-balance">
          믹싱 히스토리
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
          페이지를 닫아도 작업은 서버에서 계속됩니다. 완료된 결과도 여기에서 다시 들을 수 있어요.
        </p>
      </header>
      <div className="mt-8">
        <MixingLibrary filters={filters} initial={history} />
      </div>
    </div>
  );
}
