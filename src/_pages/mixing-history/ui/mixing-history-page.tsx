import { getMixingHistory, mixingHistoryFiltersSchema } from "@/entities/mixing-job/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
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
      <ProductPageIntro
        className="pb-4"
        description="페이지를 닫아도 작업은 서버에서 계속됩니다. 완료된 결과도 여기에서 다시 들을 수 있어요."
        eyebrow="AI mixing"
        title="믹싱 히스토리"
      />
      <div className="mt-8">
        <MixingLibrary filters={filters} initial={history} />
      </div>
    </div>
  );
}
