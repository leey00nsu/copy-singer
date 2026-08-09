import Link from "next/link";
import type { RecommendationItemResponse } from "@/entities/recommendation";
import { formatRecommendedShift, recommendationMatchPercent } from "@/entities/recommendation";
import { RecommendationMixingAction } from "@/features/create-mixing";
import { Badge } from "@/shared/ui/badge";

export function RecommendationSongList({
  items,
  onStart,
  runId,
}: {
  items: RecommendationItemResponse[];
  onStart: (itemId: string, retry?: boolean) => void;
  runId: string;
}) {
  return (
    <div className="border-y">
      <table className="block w-full table-fixed border-collapse md:table">
        <caption className="sr-only">추천 노래 비교 목록</caption>
        <thead className="hidden border-b bg-muted/20 text-left text-xs text-muted-foreground md:table-header-group">
          <tr>
            <th className="w-16 px-4 py-3 font-medium" scope="col">
              순위
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              곡
            </th>
            <th className="w-28 px-4 py-3 font-medium" scope="col">
              추천 적합도
            </th>
            <th className="w-28 px-4 py-3 font-medium" scope="col">
              추천 키
            </th>
            <th className="w-[22rem] px-4 py-3 font-medium" scope="col">
              AI 믹싱
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y md:table-row-group">
          {items.map((item) => (
            <tr className="grid grid-cols-2 gap-4 py-5 md:table-row md:py-0" key={item.id}>
              <td className="hidden px-4 py-5 align-top text-sm font-semibold md:table-cell">{item.rank}</td>
              <td className="col-span-2 min-w-0 px-4 align-top md:py-5">
                <div className="flex items-start gap-3">
                  <Badge className="md:hidden" variant={item.rank <= 3 ? "default" : "secondary"}>
                    {item.rank}위
                  </Badge>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">
                      <Link
                        className="underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={`/recommendations/${runId}/songs/${item.id}`}
                      >
                        {item.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.artist}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.reasons[0]}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">TJ #{item.catalogOrder}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 align-top md:py-5">
                <p className="text-xs text-muted-foreground md:sr-only">추천 적합도</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-data-accent-foreground md:mt-0">
                  {recommendationMatchPercent(item)}%
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">원키 {Math.round(item.originalKeyScore)}%</p>
              </td>
              <td className="px-4 align-top md:py-5">
                <p className="text-xs text-muted-foreground md:sr-only">추천 키</p>
                <p className="mt-1 text-sm font-semibold md:mt-0">{formatRecommendedShift(item.recommendedShift)}</p>
              </td>
              <td className="col-span-2 min-w-0 px-4 align-top md:py-5">
                <RecommendationMixingAction item={item} onStart={onStart} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
