"use client";

import {
  ArrowRight,
  CircleAlert,
  Download,
  LoaderCircle,
  Mic2,
  RefreshCw,
  Sparkles,
  Square,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdvancedSettings, type ConversionSettings, DEFAULT_SETTINGS } from "@/components/advanced-settings";
import { AudioWaveformPlayer } from "@/components/audio/audio-waveform-player";
import { AudioDropzone, MAX_AUDIO_UPLOAD_BYTES } from "@/components/audio-dropzone";
import { RecommendationHandoffBanner } from "@/components/recommendation-handoff";
import { Waveform } from "@/components/waveform";
import type { RecommendationRunResponse } from "@/entities/recommendation";
import { type RecommendationHandoff, selectRecommendationHandoff } from "@/entities/recommendation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { Separator } from "@/shared/ui/separator";

type JobState = {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  error?: string | null;
  result_url?: string | null;
};

async function readError(response: Response) {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { detail?: string; error?: string };
    return body.detail ?? body.error ?? `Request failed (${response.status})`;
  } catch {
    return text.trim() || `Request failed (${response.status})`;
  }
}

export function SingerWorkbench() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [job, setJob] = useState<JobState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [recommendation, setRecommendation] = useState<RecommendationHandoff | null>(null);
  const [handoffError, setHandoffError] = useState(false);
  const busy = submitting || job?.status === "queued" || job?.status === "processing";

  useEffect(() => {
    let active = true;
    void fetch("/api/health", { cache: "no-store" })
      .then((response) => {
        if (active) setApiStatus(response.ok ? "online" : "offline");
      })
      .catch(() => {
        if (active) setApiStatus("offline");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const runId = query.get("runId");
    const itemId = query.get("itemId");
    if (!runId && !itemId) return;
    if (!runId || !itemId) {
      window.queueMicrotask(() => setHandoffError(true));
      return;
    }
    let active = true;
    fetch(`/api/recommendations/${encodeURIComponent(runId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setHandoffError(true);
          return;
        }
        const run = (await response.json()) as RecommendationRunResponse;
        if (!active) return;
        const selected = selectRecommendationHandoff(run, itemId);
        if (!selected) setHandoffError(true);
        else setRecommendation(selected);
      })
      .catch(() => {
        if (active) setHandoffError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/conversions/${jobId}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    const next = (await response.json()) as JobState;
    setJob(next);
    if (next.status === "succeeded") toast.success("Your converted vocal is ready.");
    if (next.status === "failed") toast.error(next.error ?? "Conversion failed.");
  }, []);

  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    const timer = window.setInterval(() => {
      void refreshJob(job.id).catch((error: Error) => {
        window.clearInterval(timer);
        toast.error(error.message);
      });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [job, refreshJob]);

  const submit = async () => {
    if (!referenceFile || !targetFile) {
      toast.error("Add both a reference voice and target performance.");
      return;
    }
    if (referenceFile.size > MAX_AUDIO_UPLOAD_BYTES.reference) {
      toast.error("Reference audio must be 128 MB or smaller.");
      return;
    }
    if (targetFile.size > MAX_AUDIO_UPLOAD_BYTES.target) {
      toast.error("Target audio must be 256 MB or smaller.");
      return;
    }

    const data = new FormData();
    data.append("prompt_audio", referenceFile);
    data.append("target_audio", targetFile);
    data.append("prompt_vocal_separation", String(settings.promptVocalSeparation));
    data.append("target_vocal_separation", String(settings.targetVocalSeparation));
    data.append("auto_pitch_shift", String(settings.autoPitchShift));
    data.append("auto_mix_accompaniment", String(settings.autoMixAccompaniment));
    data.append("pitch_shift", String(settings.pitchShift));
    data.append("steps", String(settings.steps));
    data.append("cfg", String(settings.cfg));
    data.append("seed", String(settings.seed));

    setSubmitting(true);
    setJob(null);
    try {
      const response = await fetch("/api/conversions", { method: "POST", body: data });
      if (!response.ok) throw new Error(await readError(response));
      setJob((await response.json()) as JobState);
      toast.success("Conversion queued on the GPU.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start conversion.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearJob = async () => {
    if (job) {
      await fetch(`/api/conversions/${job.id}`, { method: "DELETE" }).catch(() => undefined);
    }
    setJob(null);
  };

  return (
    <main className="min-h-screen">
      <header className="site-header">
        <div className="page-shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="brand-mark">
              <Mic2 className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Copy Singer</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">SoulX Singer Lab</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/profile">
              <UserRoundSearch className="size-4" /> 내 보컬 프로필
            </Link>
            <Badge
              className={cn(
                "gap-1.5",
                apiStatus === "online" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                apiStatus === "offline" && "border-red-200 bg-red-50 text-red-700",
              )}
              variant="outline"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  apiStatus === "online"
                    ? "bg-emerald-500"
                    : apiStatus === "offline"
                      ? "bg-red-500"
                      : "animate-pulse bg-amber-500",
                )}
              />
              {apiStatus === "online"
                ? "Modal API connected"
                : apiStatus === "offline"
                  ? "Modal API unavailable"
                  : "Checking Modal API"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="page-shell py-10 sm:py-14">
        <section className="hero-copy">
          <Badge className="mb-4 gap-1.5" variant="secondary">
            <Sparkles className="size-3" /> Zero-shot voice conversion
          </Badge>
          <h1>
            Weave a new voice into
            <br className="hidden sm:block" /> the performance.
          </h1>
          <p>
            Choose a singing voice, add the performance to transform, then let SoulX-Singer preserve its melody and
            expression.
          </p>
        </section>

        {recommendation ? <RecommendationHandoffBanner selection={recommendation} /> : null}
        {handoffError ? (
          <p
            className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-muted-foreground"
            role="status"
          >
            추천 선택 정보를 확인할 수 없습니다. 추천 결과에서 곡을 다시 선택해주세요. 기존 수동 합성 기능은 그대로
            사용할 수 있습니다.
          </p>
        ) : null}

        <div className="workbench-grid mt-9">
          <section className="space-y-4">
            <AudioDropzone disabled={busy} file={referenceFile} kind="reference" onFile={setReferenceFile} />
            <AudioDropzone disabled={busy} file={targetFile} kind="target" onFile={setTargetFile} />
            <AdvancedSettings disabled={busy} onChange={setSettings} settings={settings} />
          </section>

          <aside className="result-column">
            <Card className="result-card overflow-hidden py-0">
              <CardHeader className="border-b border-border/70 px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-[15px]">Generated vocal</CardTitle>
                    <CardDescription className="mt-1 text-xs">Your converted result appears here.</CardDescription>
                  </div>
                  {job ? (
                    <Badge variant={job.status === "succeeded" ? "default" : "secondary"}>{job.status}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex min-h-[322px] flex-col justify-between p-6">
                {job?.status === "succeeded" ? (
                  <div className="result-success">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Conversion complete</p>
                        <p className="mt-1 text-xs text-muted-foreground">Listen, compare, or download the WAV file.</p>
                      </div>
                      <span className="success-orbit">
                        <Sparkles className="size-5" />
                      </span>
                    </div>
                    <AudioWaveformPlayer
                      className="mt-6"
                      label="Generated vocal"
                      src={`/api/conversions/${job.id}/audio`}
                    />
                    <a
                      className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
                      download={`vocal-loom-${job.id}.wav`}
                      href={`/api/conversions/${job.id}/audio`}
                    >
                      <Download className="size-4" /> Download WAV
                    </a>
                  </div>
                ) : busy ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <span className="processing-orbit">
                      <LoaderCircle className="size-7 animate-spin" />
                    </span>
                    <p className="mt-6 text-base font-semibold">Shaping the new vocal</p>
                    <p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">
                      {job?.status === "queued"
                        ? "Waiting for the Modal GPU to become available."
                        : "Preserving phrasing, pitch and timing while transferring the voice."}
                    </p>
                    <Progress
                      className="mt-6 h-1.5 w-full max-w-[280px]"
                      value={job?.status === "processing" ? 66 : 24}
                    />
                  </div>
                ) : job?.status === "failed" ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <span className="error-orbit">
                      <CircleAlert className="size-6" />
                    </span>
                    <p className="mt-5 font-semibold">Conversion stopped</p>
                    <p className="mt-2 max-w-[300px] text-sm leading-6 text-muted-foreground">
                      {job.error ?? "Check the source files and try again."}
                    </p>
                  </div>
                ) : (
                  <div className="empty-result flex flex-1 flex-col justify-center">
                    <div className="relative">
                      <Waveform quiet />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-card/10 to-card" />
                    </div>
                    <Separator className="my-7" />
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                        01
                      </span>
                      <div>
                        <p className="text-sm font-medium">Add two audio files</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          A clean reference voice and the performance you want to transform.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                        02
                      </span>
                      <div>
                        <p className="text-sm font-medium">Convert and listen</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          GPU jobs may take a few minutes on the first cold start.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-2">
                  {busy ? (
                    <Button className="w-full" onClick={() => void clearJob()} variant="outline">
                      <Square className="size-3.5" /> Cancel conversion
                    </Button>
                  ) : job ? (
                    <Button className="w-full" onClick={() => void clearJob()} variant="outline">
                      <RefreshCw className="size-3.5" /> Start another
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Button
              className="convert-button"
              disabled={!referenceFile || !targetFile || busy}
              onClick={() => void submit()}
              size="lg"
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {submitting ? "Uploading…" : "Convert singing voice"}
              {!submitting ? <ArrowRight className="ml-auto size-4" /> : null}
            </Button>
            <p className="px-4 text-center text-[11px] leading-5 text-muted-foreground">
              Only use voices and music you have permission to process. Files are removed after 24 hours.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
