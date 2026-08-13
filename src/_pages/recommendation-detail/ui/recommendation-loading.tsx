import { Skeleton } from "@/shared/ui/skeleton";

export default function RecommendationLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="추천 결과를 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-8 sm:px-7 lg:px-8 lg:py-10"
      role="status"
    >
      {/* stepper */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div className="flex flex-col items-center gap-2" key={i}>
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* ProductPageIntro task variant */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,.36fr)] lg:items-end lg:mt-10">
        <div className="min-w-0">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2.5 h-9 w-[18rem] max-w-full sm:h-10" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-5/6 max-w-2xl" />
        </div>
        <Skeleton className="hidden h-28 w-full rounded-2xl lg:block" />
      </div>

      {/* filter bar */}
      <Skeleton className="mt-8 h-[4.5rem] w-full rounded-2xl" />

      {/* table + aside */}
      <div className="mt-7 grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0">
        <div>
          <div className="flex items-center justify-between gap-4 border-b pb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="flex items-center gap-4 py-4" key={i}>
                <Skeleton className="h-4 w-6 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="hidden h-7 w-20 rounded-full sm:block" />
                <Skeleton className="hidden h-8 w-20 rounded-md sm:block" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="hidden h-[18rem] w-full rounded-xl border lg:block" />
      </div>

      <Skeleton className="mt-8 h-20 w-full rounded-xl" />
      <span className="sr-only">추천 결과를 불러오는 중</span>
    </div>
  );
}
