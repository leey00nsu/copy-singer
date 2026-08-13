import { Skeleton } from "@/shared/ui/skeleton";

export default function VocalProfileDetailLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="보컬 프로필 상세를 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12"
      role="status"
    >
      <Skeleton className="h-8 w-20 rounded-md" />
      <div className="mt-6 flex flex-wrap items-start justify-between gap-8 pb-7">
        <div className="flex min-w-0 max-w-3xl items-start gap-4 sm:gap-5">
          <Skeleton className="size-20 shrink-0 rounded-2xl sm:size-24" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-7 w-48 sm:h-8 sm:w-64" />
            <Skeleton className="h-3 w-full max-w-xl" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="mt-10 space-y-4 sm:mt-14">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton className="h-28 rounded-xl" key={i} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <span className="sr-only">보컬 프로필 상세를 불러오는 중</span>
    </div>
  );
}
