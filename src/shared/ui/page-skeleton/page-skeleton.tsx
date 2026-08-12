import type * as React from "react";

import { cn } from "@/shared/lib/cn";
import { Skeleton } from "@/shared/ui/skeleton";

type PageSkeletonProps = React.ComponentProps<"div"> & {
  label?: string;
  rows?: number;
};

function PageSkeleton({ className, label = "페이지를 불러오는 중", rows = 3, ...props }: PageSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn("mx-auto w-full max-w-5xl space-y-8 px-5 py-10 md:px-8", className)}
      role="status"
      {...props}
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex items-center gap-4 py-5" key={index}>
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden h-9 w-24 sm:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export type { PageSkeletonProps };
export { PageSkeleton };
