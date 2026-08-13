"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type RecommendationHandoff,
  recommendationDetailQueryOptions,
  selectRecommendationHandoff,
} from "@/entities/recommendation";
import {
  conversionDetailQueryOptions,
  conversionHealthQueryOptions,
  conversionKeys,
  deleteConversionMutationOptions,
  isActiveConversion,
  submitConversionMutationOptions,
} from "@/features/development-conversion";
import { cn } from "@/shared/lib/cn";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { Separator } from "@/shared/ui/separator";
import { StatusNotice } from "@/shared/ui/status-notice";
import { AdvancedSettings, type ConversionSettings, DEFAULT_SETTINGS } from "./advanced-settings";
import { AudioDropzone, MAX_AUDIO_UPLOAD_BYTES } from "./audio-dropzone";
import { RecommendationHandoffBanner } from "./recommendation-handoff";
import { Waveform } from "./waveform";

export function SingerWorkbench({
  handoff,
  handoffInvalid = false,
}: {
  handoff: { runId: string; itemId: string } | null;
  handoffInvalid?: boolean;
}) {
  const queryClient = useQueryClient();
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [jobId, setJobId] = useState<string | null>(null);
  const healthQuery = useQuery(conversionHealthQueryOptions());
  const handoffQuery = useQuery(recommendationDetailQueryOptions(handoff?.runId ?? null));
  const jobQuery = useQuery(conversionDetailQueryOptions(jobId));
  const submitMutation = useMutation({
    ...submitConversionMutationOptions(),
    onSuccess: (nextJob) => {
      queryClient.setQueryData(conversionKeys.detail(nextJob.id), nextJob);
      setJobId(nextJob.id);
      toast.success("Conversion queued on the GPU.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not start conversion.");
    },
  });
  const deleteMutation = useMutation(deleteConversionMutationOptions());
  const job = jobQuery.data ?? null;
  const recommendation: RecommendationHandoff | null =
    handoff && handoffQuery.data ? selectRecommendationHandoff(handoffQuery.data, handoff.itemId) : null;
  const handoffError =
    handoffInvalid || handoffQuery.isError || (handoff !== null && handoffQuery.data !== undefined && !recommendation);
  const apiStatus: "checking" | "online" | "offline" = healthQuery.isPending
    ? "checking"
    : healthQuery.data?.status === "ok"
      ? "online"
      : "offline";
  const busy = submitMutation.isPending || isActiveConversion(job);
  const terminalNoticeRef = useRef<string | null>(null);
  const pollingErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!job || (job.status !== "succeeded" && job.status !== "failed")) return;
    const noticeKey = `${job.id}:${job.status}`;
    if (terminalNoticeRef.current === noticeKey) return;
    terminalNoticeRef.current = noticeKey;
    if (job.status === "succeeded") toast.success("Your converted vocal is ready.");
    else toast.error(job.error ?? "Conversion failed.");
  }, [job]);

  useEffect(() => {
    if (!jobId || !jobQuery.error) return;
    const errorKey = `${jobId}:${jobQuery.error.message}`;
    if (pollingErrorRef.current === errorKey) return;
    pollingErrorRef.current = errorKey;
    toast.error(jobQuery.error.message);
  }, [jobId, jobQuery.error]);

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

    setJobId(null);
    submitMutation.mutate(data);
  };

  const clearJob = async () => {
    const currentJobId = jobId;
    if (currentJobId) {
      await deleteMutation.mutateAsync(currentJobId).catch(() => undefined);
      queryClient.removeQueries({ queryKey: conversionKeys.detail(currentJobId), exact: true });
    }
    setJobId(null);
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
              <p className="text-sm font-semibold tracking-tight">Copysinger</p>
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
          <StatusNotice
            className="mt-6"
            description="추천 결과에서 곡을 다시 선택해주세요. 기존 수동 합성 기능은 그대로 사용할 수 있습니다."
            title="추천 선택 정보를 확인할 수 없습니다"
            tone="warning"
          />
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
              {submitMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {submitMutation.isPending ? "Uploading…" : "Convert singing voice"}
              {!submitMutation.isPending ? <ArrowRight className="ml-auto size-4" /> : null}
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
