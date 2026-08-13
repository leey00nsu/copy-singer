import { Skeleton } from "@/shared/ui/skeleton";

export default function AdminCustomMixingLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="커스텀 믹싱을 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-6 py-8 lg:px-8 lg:py-10"
      role="status"
    >
      <Skeleton className="h-4 w-24" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="mt-8 rounded-xl border p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-6 h-10 w-full max-w-sm rounded-md" />
        <Skeleton className="mt-4 h-24 w-full rounded-lg" />
        <Skeleton className="mt-4 h-10 w-32 rounded-md" />
      </div>
      <span className="sr-only">커스텀 믹싱을 불러오는 중</span>
    </div>
  );
}
