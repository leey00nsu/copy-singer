import { Skeleton } from "@/shared/ui/skeleton";

export default function AccountLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="계정을 불러오는 중"
      className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14"
      role="status"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-3xl space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-32 sm:h-10" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      </div>

      <section className="mt-10 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <div className="rounded-3xl bg-muted/55 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div className="space-y-2" key={i}>
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-52 flex-col justify-between rounded-3xl bg-foreground p-6 sm:p-7">
          <Skeleton className="h-4 w-32 bg-background/20" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-28 bg-background/20" />
            <Skeleton className="h-3 w-48 bg-background/15" />
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl bg-muted/55 px-3 sm:px-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:py-4" key={i}>
              <Skeleton className="size-8 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="ml-auto h-4 w-10" />
                <Skeleton className="ml-auto h-3 w-14" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </section>
      <span className="sr-only">계정을 불러오는 중</span>
    </div>
  );
}
