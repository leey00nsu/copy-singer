"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Download,
  Gauge,
  Headphones,
  LoaderCircle,
  Mic2,
  Music2,
  RefreshCw,
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
  const autoStartedRunRef = useRef<string | null>(null);
  const startingItemsRef = useRef(new Set<string>());

  const mergeRun = (next: RecommendationRunResponse) => {
    setRun((current) => ({
      ...next,
      items: next.items.map((item) => {
        if (item.synthesis.status !== "not_started" || !startingItemsRef.current.has(item.id)) return item;
        const previous = current?.items.find((candidate) => candidate.id === item.id);
        return { ...item, synthesis: previous?.synthesis.status === "preparing" ? previous.synthesis : { ...item.synthesis, status: "preparing" } };
      }),
    }));
  };

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

  useEffect(() => {
    if (!run || autoStartedRunRef.current === run.id) return;
    autoStartedRunRef.current = run.id;
    const pending = run.items.filter((item) => item.synthesis.status === "not_started");
    if (pending.length === 0) return;
    pending.forEach((item) => startingItemsRef.current.add(item.id));
    let mounted = true;
    void (async () => {
      for (const item of pending) {
        try {
          const response = await fetch(`/api/recommendations/${run.id}/items/${item.id}/synthesis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          const payload = await response.json() as RecommendationRunResponse | { error?: { code?: string; message?: string; retryable?: boolean } };
          startingItemsRef.current.delete(item.id);
          if (!mounted) continue;
          if (!response.ok || !("items" in payload)) {
            const error = "error" in payload ? payload.error : null;
            setRun((current) => current ? { ...current, items: current.items.map((candidate) => candidate.id === item.id ? {
              ...candidate,
              synthesis: { ...candidate.synthesis, status: "failed", error: { code: error?.code ?? "SYNTHESIS_UPSTREAM_FAILED", detail: error?.message ?? "합성 작업을 시작하지 못했습니다.", retryable: error?.retryable ?? true } },
            } : candidate) } : current);
          } else {
            mergeRun(payload);
          }
        } catch {
          startingItemsRef.current.delete(item.id);
          if (mounted) setRun((current) => current ? { ...current, items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, synthesis: { ...candidate.synthesis, status: "failed", error: { code: "SYNTHESIS_UPSTREAM_FAILED", detail: "합성 서버에 연결하지 못했습니다.", retryable: true } } } : candidate) } : current);
        }
      }
    })();
    return () => { mounted = false; };
  }, [run]);

  useEffect(() => {
    if (!run?.items.some((item) => ["preparing", "queued", "processing"].includes(item.synthesis.status))) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/recommendations/${run.id}`, { cache: "no-store" });
        if (response.ok && !cancelled) mergeRun(await response.json() as RecommendationRunResponse);
      } catch {
        // Keep the last known states and try again on the next render cycle.
      }
    }, 5_000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [run]);

  const retryItem = async (itemId: string) => {
    if (!run || startingItemsRef.current.has(itemId)) return;
    startingItemsRef.current.add(itemId);
    setRun((current) => current ? { ...current, items: current.items.map((item) => item.id === itemId ? { ...item, synthesis: { ...item.synthesis, status: "preparing", error: null } } : item) } : current);
    try {
      const response = await fetch(`/api/recommendations/${run.id}/items/${itemId}/synthesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retry: true }),
      });
      const payload = await response.json() as RecommendationRunResponse;
      if (!response.ok) throw new Error("retry failed");
      mergeRun(payload);
    } catch {
      toast.error("이 곡의 합성을 다시 시작하지 못했습니다.");
    } finally {
      startingItemsRef.current.delete(itemId);
    }
  };

  const deleteRun = async () => {
    if (deleting || !window.confirm("이 추천 결과와 합성 파일을 삭제할까요? 보컬 프로필은 유지됩니다.")) return;
    setDeleting(true);
    try {
      if (!run) return;
      const response = await fetch(`/api/recommendations/${run.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      toast.success("추천 결과를 삭제했습니다.");
      // Direct Node-rendered component tests do not provide a Next router context.
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
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">이번 한 소절에서 관찰된 음역을 기준으로 계산했습니다. 추천과 함께 세 곡에 내 목소리를 입히고 있어요. 실제 노래방 음원과 당일 컨디션에 따라 알맞은 키는 달라질 수 있습니다.</p>
        </section>

        {run.lowConfidence ? (
          <section className="mx-auto mt-8 flex max-w-3xl gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm leading-6" role="status">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p><strong>조금 더 긴 소절로 다시 측정해보세요.</strong><br /><span className="text-muted-foreground">분석 신뢰도가 낮아 순위와 추천 키가 달라질 수 있습니다. 현재 결과도 참고용으로 확인할 수 있어요.</span></p>
          </section>
        ) : null}

        <section aria-label="추천 상위 3곡" className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-3">
          {run.items.map((item) => (
            <Card className={`flex flex-col ${item.rank === 1 ? "border-primary/45 shadow-lg shadow-primary/5" : ""}`} key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={item.rank === 1 ? "default" : "secondary"}>{item.rank}위</Badge>
                  <span className="font-mono text-xs text-muted-foreground">TJ #{item.catalogOrder}</span>
                </div>
                <CardTitle className="pt-2 text-xl">{item.title}</CardTitle>
                <CardDescription>{item.artist}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
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
                <div className="mt-auto rounded-2xl border bg-muted/25 p-4">
                  {["not_started", "preparing", "queued", "processing"].includes(item.synthesis.status) ? (
                    <div aria-live="polite" className="text-center">
                      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><LoaderCircle className="size-5 animate-spin" /></span>
                      <p className="mt-3 font-semibold">믹싱 중이에요</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.synthesis.status === "queued" ? "GPU 순서를 기다리고 있어요." : item.synthesis.status === "processing" ? "내 목소리를 원곡에 입히고 있어요." : "보컬과 원곡을 준비하고 있어요."}
                      </p>
                    </div>
                  ) : item.synthesis.status === "succeeded" && item.synthesis.audioUrl ? (
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Headphones className="size-4" /> 내 목소리 데모</p>
                      {/* Audio-only generated result does not have a meaningful caption track. */}
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio className="mt-3 w-full" controls preload="none" src={item.synthesis.audioUrl} />
                      <a className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-3 w-full`} download={`${item.artist}-${item.title}-copy-singer.wav`} href={item.synthesis.audioUrl}><Download className="size-4" /> 결과 저장</a>
                    </div>
                  ) : (
                    <div aria-live="polite" className="text-center">
                      <AlertTriangle className="mx-auto size-6 text-destructive" />
                      <p className="mt-2 text-sm font-semibold">이 곡의 믹싱을 완료하지 못했어요</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.synthesis.error?.detail ?? "잠시 뒤 다시 시도해주세요."}</p>
                      {item.synthesis.error?.retryable ? <Button className="mt-3 w-full" onClick={() => void retryItem(item.id)} size="sm" variant="outline"><RefreshCw className="size-4" /> 이 곡 다시 시도</Button> : <a className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-3 w-full`} href="/profile"><Mic2 className="size-4" /> 다시 녹음</a>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-card/75 p-5 text-xs leading-6 text-muted-foreground">
          <div className="flex gap-3"><Mic2 className="mt-0.5 size-4 shrink-0" /><p>이 결과는 <strong className="text-foreground">{run.scoringVersion}</strong>으로 계산한 노래 선택 참고값이며 가창력이나 건강 상태를 평가하지 않습니다. 합성은 원곡의 음정을 그대로 따르며 추천 노래방 키는 직접 부를 때의 안내입니다.</p></div>
          <div className="mt-2 flex gap-3"><Clock3 className="mt-0.5 size-4 shrink-0" /><p>GPU가 한 곡씩 처리해 완료 시간이 서로 다를 수 있습니다. 결과와 입력은 최대 24시간 후 만료됩니다.</p></div>
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
