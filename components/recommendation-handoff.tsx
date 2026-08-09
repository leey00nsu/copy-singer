import { ArrowLeft, BadgeCheck, Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { RecommendationHandoff } from "@/lib/recommendation/handoff";
import { formatRecommendedShift } from "@/lib/recommendation/ranking";

export function RecommendationHandoffBanner({ selection }: { selection: RecommendationHandoff }) {
  return (
    <section aria-label="선택한 추천곡" className="mt-7 rounded-2xl border border-primary/25 bg-primary/5 p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-primary" />
            <p className="text-xs font-semibold text-primary">추천 결과에서 선택한 곡</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">{selection.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{selection.artist}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border bg-background/80 px-4 py-3 text-right">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Gauge className="size-3" /> 추천 노래방 키
            </p>
            <p className="mt-1 text-lg font-semibold">{formatRecommendedShift(selection.recommendedShift)}</p>
          </div>
          <Badge variant="secondary">
            {selection.originalKeyScore.toFixed(1)} → {selection.adjustedScore.toFixed(1)}
          </Badge>
        </div>
      </div>
      <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center">
        <p>
          이 키는 노래방 시작 키 안내입니다. 아래 SVC pitch 설정에는 자동 적용되지 않으며, target 오디오도 직접 선택해야
          합니다.
        </p>
        <a className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/recommendations/${selection.runId}`}>
          <ArrowLeft className="size-3.5" /> 추천 결과
        </a>
      </div>
    </section>
  );
}
