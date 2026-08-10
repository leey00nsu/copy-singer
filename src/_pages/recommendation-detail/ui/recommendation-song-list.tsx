import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { RecommendationItemResponse } from "@/entities/recommendation";
import { formatRecommendedShift, recommendationMatchPercent } from "@/entities/recommendation";
import { RecommendationMixingAction } from "@/features/create-mixing";
import { Badge } from "@/shared/ui/badge";

export function RecommendationSongList({
  items,
  onStart,
  onSelect,
  runId,
  selectedItemId,
}: {
  items: RecommendationItemResponse[];
  onStart: (itemId: string, retry?: boolean) => void;
  onSelect: (itemId: string) => void;
  runId: string;
  selectedItemId: string;
}) {
  return (
    <div className="border-y">
      <table className="block w-full table-fixed border-collapse xl:table">
        <caption className="sr-only">추천 노래 비교 목록</caption>
        <thead className="hidden border-b bg-muted/20 text-left text-xs text-muted-foreground xl:table-header-group">
          <tr>
            <th className="w-14 px-3 py-2.5 font-medium" scope="col">
              순위
            </th>
            <th className="px-3 py-2.5 font-medium" scope="col">
              곡
            </th>
            <th className="w-24 px-3 py-2.5 font-medium" scope="col">
              추천 적합도
            </th>
            <th className="w-24 px-3 py-2.5 font-medium" scope="col">
              추천 키
            </th>
            <th className="w-32 px-3 py-2.5 font-medium" scope="col">
              믹싱 상태
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y xl:table-row-group">
          {items.map((item) => {
            const matchPercent = recommendationMatchPercent(item);
            const detailHref = `/recommendations/${runId}/songs/${item.id}`;
            const selected = item.id === selectedItemId;
            return (
              <tr
                aria-selected={selected}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-4 transition-colors aria-selected:bg-data-accent/[0.07] sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_6rem] sm:items-center sm:gap-4 sm:py-3 xl:table-row xl:px-0 xl:py-0"
                key={item.id}
              >
                <td className="hidden px-3 py-3 align-middle text-sm font-semibold xl:table-cell">{item.rank}</td>
                <td className="col-span-3 min-w-0 align-middle sm:col-span-1 xl:px-3 xl:py-3">
                  <div className="flex items-start gap-3">
                    <Badge className="xl:hidden" variant={item.rank <= 3 ? "default" : "secondary"}>
                      {item.rank}위
                    </Badge>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="min-w-0 truncate text-sm font-semibold sm:text-base">
                          <button
                            aria-pressed={selected}
                            className="max-w-full truncate text-left underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => onSelect(item.id)}
                            type="button"
                          >
                            {item.title}
                          </button>
                        </h2>
                        <Link
                          aria-label={`${item.title} 전체 분석 근거`}
                          className="shrink-0 text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          href={detailHref}
                        >
                          <ArrowUpRight aria-hidden="true" className="size-3.5" />
                        </Link>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{item.artist}</p>
                    </div>
                  </div>
                </td>
                <td className="align-middle xl:px-3 xl:py-3">
                  <p className="text-[11px] text-muted-foreground sm:sr-only">추천 적합도</p>
                  <p
                    className={`mt-0.5 text-lg font-semibold tracking-tight xl:mt-0 ${matchPercent >= 90 ? "text-success-foreground" : "text-foreground"}`}
                  >
                    {matchPercent}%
                  </p>
                </td>
                <td className="align-middle xl:px-3 xl:py-3">
                  <p className="text-[11px] text-muted-foreground sm:sr-only">추천 키</p>
                  <p className="mt-0.5 text-sm font-semibold xl:mt-0">
                    {formatRecommendedShift(item.recommendedShift)}
                  </p>
                </td>
                <td className="min-w-0 self-end text-right align-middle xl:px-3 xl:py-3 xl:text-left">
                  <RecommendationMixingAction compact detailHref={detailHref} item={item} onStart={onStart} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
