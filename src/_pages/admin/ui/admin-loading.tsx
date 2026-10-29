import { Skeleton } from "@/shared/ui/skeleton";

export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="운영 관리를 불러오는 중"
      role="status"
      className="mx-auto w-full max-w-[72rem] px-6 py-8 lg:px-8 lg:py-10"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-8 flex gap-6 border-b pb-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="mt-7 flex gap-3">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="mt-5 h-3 w-48" />
      <Skeleton className="mt-6 h-10 w-full rounded-lg" />
      <div className="mt-5">
        <Skeleton className="h-10 w-full" />
        <div className="mt-2 space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton className="h-16 w-full" key={i} />
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
      <span className="sr-only">운영 관리를 불러오는 중</span>
    </div>
  );
}
