import { Skeleton } from "@/shared/ui/skeleton";

export default function MixingDetailLoading() {
  return (
    <div
      aria-label="AI 믹스 상세 불러오는 중"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16"
      role="status"
    >
      <Skeleton className="h-9 w-32" />
      <div className="mt-8 flex flex-wrap justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-72 max-w-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="mt-10 grid gap-1 rounded-2xl bg-muted/25 p-1 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="space-y-2 rounded-xl bg-background/75 px-5 py-6" key={item}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-10 h-52 w-full" />
    </div>
  );
}
