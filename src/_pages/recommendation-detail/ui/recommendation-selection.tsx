import { ArrowUpRight, Gauge, Music2, Ticket } from "lucide-react";
import Link from "next/link";
import {
  formatRecommendedShift,
  type RecommendationItemResponse,
  type RecommendationMixingCapability,
  recommendationScore,
  recommendationScoreColor,
  visibleRecommendationReasons,
} from "@/entities/recommendation";
import { RecommendationMixingAction } from "@/features/create-mixing";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { FunnelActionBar } from "@/widgets/creation-funnel";

function SelectionDetails({
  idPrefix,
  item,
  matchRank,
  mixing,
  onStart,
  runId,
  ticketCost,
}: {
  idPrefix: string;
  item: RecommendationItemResponse;
  matchRank: number | null;
  mixing?: RecommendationMixingCapability;
  onStart: (itemId: string, retry?: boolean) => void;
  runId: string;
  ticketCost: number;
}) {
  const detailHref = `/recommendations/${runId}/songs/${item.id}`;
  const visibleReasons = visibleRecommendationReasons(item);
  return (
    <section aria-labelledby={`${idPrefix}-title`}>
      <div className="flex items-center justify-between gap-3">
        <Badge variant={matchRank !== null && matchRank <= 3 ? "default" : "secondary"}>
          {matchRank === null ? "추천 순위 없음" : `추천 ${matchRank}위`}
        </Badge>
        <span className="text-2xl font-semibold" style={{ color: recommendationScoreColor(item) }}>
          {recommendationScore(item)}점
        </span>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight" id={`${idPrefix}-title`}>
        {item.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{item.artist}</p>

      <dl className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted/55 p-1">
        <div className="rounded-lg bg-background px-3 py-4">
          <dt className="text-xs text-muted-foreground">추천 키</dt>
          <dd className="mt-1 text-lg font-semibold">{formatRecommendedShift(item.recommendedShift)}</dd>
        </div>
        <div className="rounded-lg bg-background px-3 py-4">
          <dt className="text-xs text-muted-foreground">원키 적합도</dt>
          <dd className="mt-1 text-lg font-semibold">{Math.round(item.originalKeyScore)}점</dd>
        </div>
      </dl>

      {visibleReasons.length > 0 ? (
        <section aria-labelledby={`${idPrefix}-reason-title`} className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold" id={`${idPrefix}-reason-title`}>
            <Gauge aria-hidden="true" className="size-4" /> 이 곡을 추천한 이유
          </h3>
          <ul className="mt-3 divide-y text-sm leading-6">
            {visibleReasons.slice(0, 3).map(({ code, reason }, index) => (
              <li className="flex gap-3 py-3" key={`${code ?? "reason"}-${index}`}>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex items-center gap-2 text-sm font-medium">
        <Ticket aria-hidden="true" className="size-4" /> 티켓 {ticketCost}개 사용
      </div>
      <div className="mt-4 grid gap-2">
        <RecommendationMixingAction
          idleLabel="이 곡으로 AI 믹싱"
          item={item}
          mixing={mixing}
          onStart={onStart}
          ticketCost={ticketCost}
        />
        <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={detailHref}>
          전체 분석 결과 보기 <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}

export function RecommendationSelection({
  item,
  matchRank,
  mixing,
  onStart,
  runId,
  ticketCost,
}: {
  item: RecommendationItemResponse;
  matchRank: number | null;
  mixing?: RecommendationMixingCapability;
  onStart: (itemId: string, retry?: boolean) => void;
  runId: string;
  ticketCost: number;
}) {
  return (
    <>
      <aside
        className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        aria-label="선택한 추천곡"
        data-recommendation-selection-sticky=""
      >
        <div className="rounded-xl border p-6">
          <SelectionDetails
            idPrefix="desktop-selection"
            item={item}
            matchRank={matchRank}
            mixing={mixing}
            onStart={onStart}
            runId={runId}
            ticketCost={ticketCost}
          />
        </div>
      </aside>

      <div className="fixed inset-x-4 bottom-3 z-40 lg:hidden">
        <Sheet>
          <FunnelActionBar
            action={
              <SheetTrigger render={<Button />}>
                <Music2 aria-hidden="true" className="size-4" /> 선택한 곡 확인
              </SheetTrigger>
            }
            description={`${formatRecommendedShift(item.recommendedShift)} · 티켓 ${ticketCost}개`}
            eyebrow="선택한 곡"
            title={`${item.title} · ${item.artist}`}
          />
          <SheetContent aria-label="선택한 추천곡" className="max-h-[90dvh] overflow-y-auto" side="bottom">
            <SheetHeader>
              <SheetTitle>선택한 추천곡</SheetTitle>
              <SheetDescription>추천 근거와 티켓 비용을 확인한 뒤 AI 믹싱을 시작하세요.</SheetDescription>
            </SheetHeader>
            <div className="border-t px-5 pt-5 pb-7">
              <SelectionDetails
                idPrefix="mobile-selection"
                item={item}
                matchRank={matchRank}
                mixing={mixing}
                onStart={onStart}
                runId={runId}
                ticketCost={ticketCost}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
