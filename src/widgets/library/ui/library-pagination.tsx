import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";

export function LibraryPagination({
  getHref,
  label,
  page,
  pageCount,
}: {
  getHref: (page: number) => string;
  label: string;
  page: number;
  pageCount: number;
}) {
  return (
    <nav aria-label={label} className="mt-6 flex items-center justify-center gap-2">
      <Button
        disabled={page <= 1}
        nativeButton={false}
        render={<Link href={getHref(Math.max(1, page - 1))} />}
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" /> 이전
      </Button>
      <span className="min-w-20 text-center text-sm text-muted-foreground">
        {page} / {pageCount}
      </span>
      <Button
        disabled={page >= pageCount}
        nativeButton={false}
        render={<Link href={getHref(Math.min(pageCount, page + 1))} />}
        variant="outline"
      >
        다음 <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
