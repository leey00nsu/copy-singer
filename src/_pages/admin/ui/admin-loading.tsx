import { Skeleton } from "@/shared/ui/skeleton";

export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="운영 대시보드를 불러오는 중"
      className="mx-auto w-full max-w-[82rem] px-6 py-8 lg:px-8 lg:py-10"
      role="status"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="rounded-2xl border p-5" key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-14" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      <div className="mt-5 space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 xl:grid-cols-[.92fr_1.08fr]">
          {Array.from({ length: 2 }, (_, i) => (
            <div className="overflow-hidden rounded-xl border" key={i}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="p-3">
                <Skeleton className="h-6 w-full" />
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Skeleton className="h-10 w-full" key={j} />
                  ))}
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-none border-t" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">운영 대시보드를 불러오는 중</span>
    </div>
  );
}
