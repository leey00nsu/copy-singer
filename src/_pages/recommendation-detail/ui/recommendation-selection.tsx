import { ArrowUpRight, Gauge, Music2, Ticket } from "lucide-react";
import Link from "next/link";
import {
  formatRecommendedShift,
  type RecommendationItemResponse,
  recommendationMatchPercent,
} from "@/entities/recommendation";
import { RecommendationMixingAction } from "@/features/create-mixing";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { FunnelActionBar } from "@/widgets/creation-funnel";

function SelectionDetails({
  idPrefix,
  item,
  onStart,
  runId,
  ticketCost,
}: {
  idPrefix: string;
  item: RecommendationItemResponse;
  onStart: (itemId: string, retry?: boolean) => void;
  runId: string;
  ticketCost: number;
}) {
  const detailHref = `/recommendations/${runId}/songs/${item.id}`;
  return (
    <section aria-labelledby={`${idPrefix}-title`}>
      <div className="flex items-center justify-between gap-3">
        <Badge variant={item.rank <= 3 ? "default" : "secondary"}>{item.rank}위 추천</Badge>
        <span className="text-2xl font-semibold text-data-accent-foreground">{recommendationMatchPercent(item)}%</span>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight" id={`${idPrefix}-title`}>
        {item.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{item.artist}</p>

      <dl className="mt-6 grid grid-cols-2 border-y">
        <div className="py-4 pr-4">
          <dt className="text-xs text-muted-foreground">추천 키</dt>
          <dd className="mt-1 text-lg font-semibold">{formatRecommendedShift(item.recommendedShift)}</dd>
        </div>
        <div className="border-l py-4 pl-4">
          <dt className="text-xs text-muted-foreground">원키 적합도</dt>
          <dd className="mt-1 text-lg font-semibold">{Math.round(item.originalKeyScore)}%</dd>
        </div>
      </dl>

      <section aria-labelledby={`${idPrefix}-reason-title`} className="mt-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold" id={`${idPrefix}-reason-title`}>
          <Gauge aria-hidden="true" className="size-4" /> 이 곡을 추천한 이유
        </h3>
        {item.reasons.length > 0 ? (
          <ul className="mt-3 divide-y border-y text-sm leading-6">
            {item.reasons.slice(0, 3).map((reason, index) => (
              <li className="flex gap-3 py-3" key={`${item.reasonCodes[index] ?? "reason"}-${index}`}>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border-y py-4 text-sm text-muted-foreground">저장된 추천 근거가 없습니다.</p>
        )}
      </section>

      <div className="mt-6 flex items-center gap-2 text-sm font-medium">
        <Ticket aria-hidden="true" className="size-4" /> 티켓 {ticketCost}개 사용
      </div>
      <div className="mt-4 grid gap-2">
        <RecommendationMixingAction
          detailHref={detailHref}
          idleLabel="이 곡으로 AI 믹싱"
          item={item}
          onStart={onStart}
        />
        <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={detailHref}>
          전체 분석 근거 보기 <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}

export function RecommendationSelection({
  item,
  onStart,
  runId,
  ticketCost,
}: {
  item: RecommendationItemResponse;
  onStart: (itemId: string, retry?: boolean) => void;
  runId: string;
  ticketCost: number;
}) {
  return (
    <>
      <aside className="hidden lg:block" aria-label="선택한 추천곡">
        <div className="sticky top-24 rounded-xl border p-6">
          <SelectionDetails
            idPrefix="desktop-selection"
            item={item}
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
