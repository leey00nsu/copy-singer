import { Skeleton } from "@/shared/ui/skeleton";

export default function LibraryLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="라이브러리를 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14"
      role="status"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-3xl space-y-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-8 w-36 sm:h-9" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-3 w-5/6 max-w-2xl" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <Skeleton className="mt-7 h-10 w-48 rounded-full" />
      <div className="mt-4 divide-y rounded-xl border">
        {Array.from({ length: 5 }, (_, i) => (
          <div className="flex items-center gap-4 px-3 py-4 sm:px-4" key={i}>
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
            <Skeleton className="hidden h-8 w-20 rounded-md sm:block" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center">
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>
      <span className="sr-only">라이브러리를 불러오는 중</span>
    </div>
  );
}
