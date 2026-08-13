import { Skeleton } from "@/shared/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="보컬 프로필을 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-8 sm:px-7 lg:px-8 lg:py-10"
      role="status"
    >
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div className="flex flex-col items-center gap-2" key={i}>
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,.9fr)_minmax(29rem,1.1fr)] lg:items-start lg:gap-14">
        <div className="min-w-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-72 sm:h-10" />
          <Skeleton className="mt-2 h-8 w-64 sm:h-10" />
          <Skeleton className="mt-5 h-4 w-full max-w-[31rem]" />
          <Skeleton className="mt-2 h-4 w-5/6 max-w-[31rem]" />

          <div className="mt-10 space-y-2.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-1 h-4 w-72" />
            <div className="mt-5 grid gap-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <div className="flex gap-3 rounded-lg border px-4 py-3.5" key={i}>
                  <Skeleton className="size-8 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="space-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="p-5 sm:p-6">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="mt-4 h-10 w-full rounded-md border border-dashed" />
            <Skeleton className="mx-auto mt-2 h-3 w-40" />
          </div>
        </div>
      </div>
      <span className="sr-only">보컬 프로필을 불러오는 중</span>
    </div>
  );
}
