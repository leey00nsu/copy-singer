import { Skeleton } from "@/shared/ui/skeleton";

export default function MixingDetailLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="AI 믹스 상세를 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12"
      role="status"
    >
      <Skeleton className="h-8 w-28 rounded-md" />
      <div className="mt-6 flex flex-wrap items-start justify-between gap-8 pb-10">
        <div className="min-w-0 max-w-3xl space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-1 h-7 w-48" />
          <Skeleton className="h-8 w-64 sm:h-10" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-11 w-52 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>

      <section className="py-8 sm:py-10 lg:py-12">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl" />
      </section>

      <div className="mt-10 grid gap-1 rounded-2xl bg-muted/55 p-1 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div className="rounded-xl bg-background px-5 py-6" key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-6 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <span className="sr-only">AI 믹스 상세를 불러오는 중</span>
    </div>
  );
}
