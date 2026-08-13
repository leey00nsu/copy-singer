import { Skeleton } from "@/shared/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="알림을 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14"
      role="status"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-3xl space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20 sm:h-10" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <ul className="divide-y overflow-hidden rounded-xl border">
          {Array.from({ length: 5 }, (_, i) => (
            <li className="flex gap-4 px-3 py-4 sm:px-4" key={i}>
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="hidden size-2 rounded-full sm:block" />
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
      <span className="sr-only">알림을 불러오는 중</span>
    </div>
  );
}
