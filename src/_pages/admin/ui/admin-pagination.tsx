import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function AdminPagination({
  page,
  pageCount,
  total,
  previousHref,
  nextHref,
  label,
}: {
  page: number;
  pageCount: number;
  total: number;
  previousHref: string;
  nextHref: string;
  label: string;
}) {
  return (
    <nav
      aria-label={`${label} 페이지`}
      className="mt-4 flex items-center justify-between text-xs text-muted-foreground"
    >
      <span>검색 결과 {total}건</span>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link
            href={previousHref}
            scroll={false}
            aria-label={`이전 ${label} 페이지`}
            className="rounded-md border p-1.5"
          >
            <ChevronLeft className="size-3.5" />
          </Link>
        ) : (
          <span className="size-7" />
        )}
        <span className="tabular-nums">
          {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={nextHref} scroll={false} aria-label={`다음 ${label} 페이지`} className="rounded-md border p-1.5">
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span className="size-7" />
        )}
      </div>
    </nav>
  );
}
