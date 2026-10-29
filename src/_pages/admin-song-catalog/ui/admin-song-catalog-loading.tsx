import { Skeleton } from "@/shared/ui/skeleton";
import { AdminNavigationLoading } from "@/widgets/admin-navigation";

export default function AdminSongCatalogLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="음원 관리를 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-6 py-8 lg:px-8 lg:py-10"
      role="status"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <AdminNavigationLoading />

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-40 rounded-md" />
      </div>
      <div className="mb-3 grid gap-3 rounded-xl bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
        {["w-full", "w-full", "w-20"].map((width, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className={`h-9 rounded-md ${width}`} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="flex items-center gap-4 px-4 py-4" key={i}>
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
              <Skeleton className="hidden h-8 w-20 rounded-md sm:block" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
      <span className="sr-only">음원 관리를 불러오는 중</span>
    </div>
  );
}
