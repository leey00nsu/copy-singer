import { Skeleton } from "@/shared/ui/skeleton";

export default function SongDetailLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="곡 상세를 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12"
      role="status"
    >
      <Skeleton className="h-8 w-28 rounded-md" />
      <Skeleton className="mt-8 h-40 w-full max-w-4xl rounded-xl sm:h-52" />

      <div className="mt-8 grid gap-10 pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-64 sm:h-12 sm:w-80" />
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-20 w-28 rounded-md border-l" />
      </div>

      <div className="py-8 sm:py-10 lg:py-12">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        <div className="mt-5 grid gap-1 rounded-2xl bg-muted/55 p-1 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div className="rounded-xl bg-background px-4 py-5 sm:px-6" key={i}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-48 w-full rounded-3xl" />
      </div>

      <div className="grid gap-14 pt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="divide-y rounded-lg border">
            {Array.from({ length: 3 }, (_, i) => (
              <div className="flex gap-4 px-4 py-4" key={i}>
                <Skeleton className="h-4 w-6 shrink-0" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg border" />
      </div>
      <span className="sr-only">곡 상세를 불러오는 중</span>
    </div>
  );
}
