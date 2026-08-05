"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Gauge,
  LoaderCircle,
  Mic2,
  Music2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecommendationRunResponse } from "@/lib/recommendation/contract";
import { formatRecommendedShift } from "@/lib/recommendation/ranking";

export function RecommendationResults({
  initialRun,
  runId,
}: {
  initialRun?: RecommendationRunResponse;
  runId?: string;
}) {
  const [run, setRun] = useState<RecommendationRunResponse | null>(initialRun ?? null);
  const [loadError, setLoadError] = useState<"not-found" | "failed" | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (run || !runId) return;
    const controller = new AbortController();
    fetch(`/api/recommendations/${runId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setLoadError(response.status === 404 ? "not-found" : "failed");
          return;
        }
        setRun(await response.json() as RecommendationRunResponse);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadError("failed");
      });
    return () => controller.abort();
  }, [run, runId]);

  const deleteRun = async () => {
    if (deleting || !window.confirm("이 추천 결과를 삭제할까요? 보컬 프로필은 유지됩니다.")) return;
    setDeleting(true);
    try {
      if (!run) return;
      const response = await fetch(`/api/recommendations/${run.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      toast.success("추천 결과를 삭제했습니다.");
      // vinext has no runtime `next` package for the Node-rendered component tests.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/profile";
    } catch {
      toast.error("추천 결과를 삭제하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
      setDeleting(false);
    }
  };

  if (loadError) {
    return <main className="flex min-h-screen items-center justify-center px-4"><div className="max-w-md text-center"><AlertTriangle className="mx-auto size-9 text-destructive" /><h1 className="mt-4 text-2xl font-semibold">{loadError === "not-found" ? "추천 결과를 찾을 수 없어요." : "추천 결과를 불러오지 못했어요."}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{loadError === "not-found" ? "삭제됐거나 올바르지 않은 주소입니다." : "PostgreSQL 연결과 카탈로그 상태를 확인한 뒤 다시 시도해주세요."}</p><a className={`${buttonVariants()} mt-6`} href="/profile">보컬 프로필로 이동</a></div></main>;
  }

  if (!run) {
    return <main className="flex min-h-screen items-center justify-center"><p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> 추천 결과를 불러오는 중…</p></main>;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="page-shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="brand-mark"><Music2 className="size-4" /></span>
            <div><p className="text-sm font-semibold">Copy Singer</p><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Song match</p></div>
          </div>
          <a className={buttonVariants({ size: "sm", variant: "ghost" })} href="/profile"><ArrowLeft className="size-4" /> 다시 측정</a>
        </div>
      </header>

      <div className="page-shell py-10 sm:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <Badge className="gap-1.5" variant="secondary"><Sparkles className="size-3" /> 100곡 비교 완료</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">지금 목소리에 잘 맞는<br />노래 3곡이에요.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">이번 한 소절에서 관찰된 음역을 기준으로 계산했습니다. 실제 노래방 음원, 당일 컨디션과 부르는 방식에 따라 알맞은 키는 달라질 수 있어요.</p>
        </section>

        {run.lowConfidence ? (
          <section className="mx-auto mt-8 flex max-w-3xl gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm leading-6" role="status">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p><strong>조금 더 긴 소절로 다시 측정해보세요.</strong><br /><span className="text-muted-foreground">분석 신뢰도가 낮아 순위와 추천 키가 달라질 수 있습니다. 현재 결과도 참고용으로 확인할 수 있어요.</span></p>
          </section>
        ) : null}

        <section aria-label="추천 상위 3곡" className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-3">
          {run.items.map((item) => (
            <Card className={item.rank === 1 ? "border-primary/45 shadow-lg shadow-primary/5" : ""} key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={item.rank === 1 ? "default" : "secondary"}>{item.rank}위</Badge>
                  <span className="font-mono text-xs text-muted-foreground">TJ #{item.catalogOrder}</span>
                </div>
                <CardTitle className="pt-2 text-xl">{item.title}</CardTitle>
                <CardDescription>{item.artist}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/55 p-3"><p className="text-[11px] text-muted-foreground">원키 적합도</p><p className="mt-1 text-xl font-semibold">{item.originalKeyScore.toFixed(1)}</p></div>
                  <div className="rounded-xl bg-primary/8 p-3"><p className="text-[11px] text-muted-foreground">추천 키 적합도</p><p className="mt-1 text-xl font-semibold text-primary">{item.adjustedScore.toFixed(1)}</p></div>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground"><Gauge className="size-4" /> 추천 노래방 키</span>
                  <strong>{formatRecommendedShift(item.recommendedShift)}</strong>
                </div>
                <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
                  {item.reasons.slice(0, 3).map((reason) => <li className="flex gap-2" key={reason}><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{reason}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-card/75 p-5 text-xs leading-6 text-muted-foreground">
          <div className="flex gap-3"><Mic2 className="mt-0.5 size-4 shrink-0" /><p>이 결과는 <strong className="text-foreground">{run.scoringVersion}</strong>으로 계산한 노래 선택 참고값이며 가창력이나 건강 상태를 평가하지 않습니다. 사용 권한이 있는 음성과 음악만 합성에 사용하세요.</p></div>
        </section>

        <div className="mx-auto mt-6 flex max-w-3xl justify-between gap-3">
          <p className="self-center font-mono text-[10px] text-muted-foreground">RUN {run.id.slice(0, 8)} · {new Date(run.createdAt).toLocaleString("ko-KR")}</p>
          <Button disabled={deleting} onClick={() => void deleteRun()} variant="ghost">
            {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            결과 삭제
          </Button>
        </div>
      </div>
    </main>
  );
}
