"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileAudio,
  LoaderCircle,
  Mic,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AudioWaveformPlayer } from "@/components/audio/audio-waveform-player";
import { VocalProfileRecorder } from "@/components/audio/vocal-profile-recorder";
import { LongAudioDialog } from "@/components/long-audio-dialog";
import { VocalProfileResults } from "@/components/vocal-profile-results";
import type {
  VocalProfileAnalysisJobResponse,
  VocalProfileError,
  VocalProfileResponse,
} from "@/entities/vocal-profile";
import { isLongProfileAudio, readAudioDuration } from "@/entities/vocal-profile";
import { prepareProfileAudio } from "@/shared/lib/audio";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const MAX_PROFILE_AUDIO_BYTES = 25 * 1024 * 1024;
const ACCEPTED_AUDIO = ".wav,.mp3,.m4a,.webm,audio/wav,audio/mpeg,audio/mp4,audio/webm";
const ANALYSIS_JOB_STORAGE_KEY = "copy-singer:vocal-profile-analysis-job";
const ANALYSIS_POLL_INTERVAL_MS = 1_500;

type ServiceHealth = "checking" | "ok" | "unavailable";

const ERROR_GUIDANCE: Record<string, { title: string; action: string }> = {
  TOO_SHORT: { title: "녹음이 너무 짧아요", action: "5초 이상 노래한 뒤 다시 시도해주세요." },
  TOO_LONG: { title: "녹음이 너무 길어요", action: "파일을 다시 선택한 뒤 자동 자르기에 동의해주세요." },
  TOO_SILENT: { title: "목소리가 너무 작아요", action: "마이크에 조금 가까이 다가가 반주 없이 더 크게 불러주세요." },
  EXCESSIVE_CLIPPING: { title: "소리가 찌그러졌어요", action: "마이크에서 조금 멀어지거나 입력 음량을 낮춰주세요." },
  LOW_VOICED_RATIO: {
    title: "노래 음정을 충분히 찾지 못했어요",
    action: "말소리보다 모음 ‘아’로 길게, 반주 없이 다시 불러주세요.",
  },
  PAYLOAD_TOO_LARGE: { title: "파일이 너무 커요", action: "25MB 이하 파일을 사용해주세요." },
  UNSUPPORTED_AUDIO: { title: "지원하지 않는 오디오예요", action: "WAV, MP3, M4A 또는 WebM 파일을 사용해주세요." },
  INVALID_SEGMENTS: { title: "안내 녹음 구간이 올바르지 않아요", action: "새 안내 녹음을 만든 뒤 다시 분석해주세요." },
  ANALYZER_UNAVAILABLE: { title: "보컬 분석기에 연결할 수 없어요", action: "잠시 뒤 다시 시도해주세요." },
  ANALYZER_NOT_CONFIGURED: { title: "분석기 설정이 필요해요", action: "서버의 보컬 분석기 환경 변수를 확인해주세요." },
  ANALYSIS_ENQUEUE_FAILED: { title: "분석 대기열에 추가하지 못했어요", action: "잠시 뒤 다시 시도해주세요." },
  ANALYSIS_SOURCE_UNAVAILABLE: { title: "분석용 음성을 불러오지 못했어요", action: "잠시 뒤 다시 시도해주세요." },
  PROFILE_SAVE_FAILED: {
    title: "분석 결과를 저장하지 못했어요",
    action: "PostgreSQL 연결을 확인한 뒤 다시 시도해주세요.",
  },
};

function profileError(value: unknown): VocalProfileError {
  if (value && typeof value === "object" && "reasonCode" in value) {
    const candidate = value as Partial<VocalProfileError>;
    return {
      reasonCode: String(candidate.reasonCode),
      detail: String(candidate.detail ?? ""),
      retryable: candidate.retryable !== false,
    };
  }
  return { reasonCode: "ANALYSIS_FAILED", detail: "Unknown analysis error.", retryable: true };
}

export function VocalProfileWorkbench() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [pendingLongFile, setPendingLongFile] = useState<File | null>(null);
  const [pendingLongDuration, setPendingLongDuration] = useState<number | null>(null);
  const [preparingAudio, setPreparingAudio] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [health, setHealth] = useState<ServiceHealth>("checking");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [analysisJobStatus, setAnalysisJobStatus] = useState<VocalProfileAnalysisJobResponse["status"] | null>(null);
  const analysisIdempotencyKey = useRef<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [profile, setProfile] = useState<VocalProfileResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<VocalProfileError | null>(null);
  const audioUrl = useMemo(() => (audioFile ? URL.createObjectURL(audioFile) : null), [audioFile]);
  const analysisBusy = analyzing || analysisJobId !== null;

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    let active = true;
    void fetch("/api/vocal-profiles/health", { cache: "no-store" })
      .then((response) => {
        if (active) setHealth(response.ok ? "ok" : "unavailable");
      })
      .catch(() => {
        if (active) setHealth("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const storedJobId = window.localStorage.getItem(ANALYSIS_JOB_STORAGE_KEY);
    if (storedJobId) queueMicrotask(() => setAnalysisJobId(storedJobId));
  }, []);

  useEffect(() => {
    if (!analysisJobId) return;
    let active = true;
    window.localStorage.setItem(ANALYSIS_JOB_STORAGE_KEY, analysisJobId);

    const poll = async () => {
      while (active) {
        try {
          const response = await fetch(`/api/vocal-profile-analysis-jobs/${analysisJobId}`, { cache: "no-store" });
          const payload = (await response.json().catch(() => null)) as
            | VocalProfileAnalysisJobResponse
            | VocalProfileError
            | null;
          if (!response.ok) {
            if (active) {
              setAnalysisError(profileError(payload));
              setAnalyzing(false);
              setAnalysisJobId(null);
              setAnalysisJobStatus(null);
              analysisIdempotencyKey.current = null;
              window.localStorage.removeItem(ANALYSIS_JOB_STORAGE_KEY);
            }
            return;
          }
          const job = payload as VocalProfileAnalysisJobResponse;
          if (!active) return;
          setAnalysisJobStatus(job.status);
          if (job.status === "succeeded" && job.profile) {
            setProfile(job.profile);
            setAnalyzing(false);
            setAnalysisJobId(null);
            analysisIdempotencyKey.current = null;
            window.localStorage.removeItem(ANALYSIS_JOB_STORAGE_KEY);
            setHealth("ok");
            toast.success("보컬 프로필 분석이 완료됐습니다.");
            return;
          }
          if (job.status === "failed") {
            setAnalysisError(
              job.error ?? { reasonCode: "ANALYSIS_FAILED", detail: "Background analysis failed.", retryable: true },
            );
            setAnalyzing(false);
            setAnalysisJobId(null);
            analysisIdempotencyKey.current = null;
            window.localStorage.removeItem(ANALYSIS_JOB_STORAGE_KEY);
            return;
          }
        } catch {
          // Keep the durable job id and retry polling after transient browser/network failures.
        }
        await new Promise((resolve) => setTimeout(resolve, ANALYSIS_POLL_INTERVAL_MS));
      }
    };

    void poll();
    return () => {
      active = false;
    };
  }, [analysisJobId]);

  const resetAudio = () => {
    setAudioFile(null);
    setAudioDuration(null);
    setPendingLongFile(null);
    setPendingLongDuration(null);
    setPreparationProgress(0);
    setAnalysisError(null);
    analysisIdempotencyKey.current = null;
  };

  const prepareSelectedAudio = useCallback(async (file: File) => {
    setPreparingAudio(true);
    setPreparationProgress(0);
    try {
      const prepared = await prepareProfileAudio(file, setPreparationProgress);
      setAudioFile(prepared.file);
      setAudioDuration(prepared.durationSeconds);
      analysisIdempotencyKey.current = null;
      setAnalysisError(null);
      toast.success(`최대 60초 압축 오디오가 준비됐습니다. (${(prepared.file.size / 1024 / 1024).toFixed(1)} MB)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오디오를 변환하지 못했습니다.");
    } finally {
      setPreparingAudio(false);
    }
  }, []);

  const completeRecording = useCallback(
    (file: File) => {
      void prepareSelectedAudio(file);
    },
    [prepareSelectedAudio],
  );

  const recordingError = useCallback((error: unknown) => {
    const denied = error instanceof DOMException && error.name === "NotAllowedError";
    toast.error(
      denied ? "마이크 권한이 거부됐습니다. 권한을 허용하거나 파일을 업로드해주세요." : "마이크를 시작하지 못했습니다.",
    );
  }, []);

  const selectFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PROFILE_AUDIO_BYTES) {
      toast.error("테스트 오디오는 25MB 이하여야 합니다.");
      return;
    }
    let duration: number | null = null;
    try {
      duration = await readAudioDuration(file);
    } catch {
      // The analyzer remains the source of truth when browser metadata is unavailable.
    }
    if (duration !== null && isLongProfileAudio(duration)) {
      setPendingLongFile(file);
      setPendingLongDuration(duration);
      return;
    }
    await prepareSelectedAudio(file);
  };

  const cancelLongAudio = useCallback(() => {
    setPendingLongFile(null);
    setPendingLongDuration(null);
  }, []);

  const confirmLongAudio = () => {
    if (!pendingLongFile) return;
    const file = pendingLongFile;
    setPendingLongFile(null);
    setPendingLongDuration(null);
    void prepareSelectedAudio(file);
  };

  const analyzeAudio = async () => {
    if (!audioFile || analysisBusy) return;
    setAnalyzing(true);
    setAnalysisError(null);
    const body = new FormData();
    body.append("audio", audioFile, audioFile.name);
    const idempotencyKey = analysisIdempotencyKey.current ?? crypto.randomUUID();
    analysisIdempotencyKey.current = idempotencyKey;
    try {
      const response = await fetch("/api/vocal-profile-analysis-jobs", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw profileError(payload);
      const job = payload as VocalProfileAnalysisJobResponse;
      if (!job.id) throw profileError(payload);
      window.localStorage.setItem(ANALYSIS_JOB_STORAGE_KEY, job.id);
      setAnalysisJobStatus(job.status);
      setAnalysisJobId(job.id);
      setHealth("ok");
      toast.success("보컬 분석을 대기열에 추가했습니다.");
    } catch (error) {
      setAnalysisError(profileError(error));
      setAnalyzing(false);
    }
  };

  const deleteProfile = async () => {
    if (!profile || deleting || !window.confirm("이 보컬 프로필과 원본 녹음을 삭제할까요?")) return;
    setDeleting(true);
    setAnalysisError(null);
    try {
      const response = await fetch(`/api/vocal-profiles/${profile.id}`, { method: "DELETE" });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw profileError(payload);
      setProfile(null);
      setAudioFile(null);
      setAudioDuration(null);
      toast.success("프로필과 원본 녹음을 삭제했습니다.");
    } catch (error) {
      setAnalysisError(profileError(error));
    } finally {
      setDeleting(false);
    }
  };

  const createRecommendations = async () => {
    if (!profile || recommending) return;
    setRecommending(true);
    setAnalysisError(null);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userVocalProfileId: profile.id }),
      });
      const payload = (await response.json().catch(() => null)) as {
        id?: string;
        error?: { code?: string; message?: string; retryable?: boolean };
      } | null;
      if (!response.ok || !payload?.id) {
        throw {
          reasonCode: payload?.error?.code ?? "RECOMMENDATION_SAVE_FAILED",
          detail: payload?.error?.message ?? "Recommendation failed.",
          retryable: payload?.error?.retryable ?? true,
        } satisfies VocalProfileError;
      }
      // Direct component tests do not provide a Next router context.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/recommendations/${payload.id}`;
    } catch (error) {
      setAnalysisError(profileError(error));
      setRecommending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {pendingLongFile ? (
        <LongAudioDialog
          durationSeconds={pendingLongDuration}
          fileName={pendingLongFile.name}
          onCancel={cancelLongAudio}
          onConfirm={confirmLongAudio}
        />
      ) : null}
      <header className="site-header">
        <div className="page-shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="brand-mark">
              <Mic className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Copy Singer</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Vocal profile lab</p>
            </div>
          </div>
          <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/">
            <ArrowLeft className="size-4" /> 처음으로
          </Link>
        </div>
      </header>

      <div className="page-shell py-10 sm:py-14">
        <section className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Step 1 · 내 음역 측정</Badge>
            <Badge className="gap-1.5" variant={health === "ok" ? "outline" : "secondary"}>
              {health === "checking" ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : (
                <Activity className="size-3" />
              )}
              {health === "checking" ? "분석기 확인 중" : health === "ok" ? "분석기 준비됨" : "분석기 연결 필요"}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            노래 한 소절로,
            <br />내 목소리의 기준점을 만드세요.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            정해진 음계 없이 평소처럼 편안하게 부르면 됩니다. 결과는 이 녹음에서 관찰된 추천용 측정값이며 의료적 진단이
            아닙니다.
          </p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>무엇을 부르면 되나요?</CardTitle>
              <CardDescription>잘 부르려고 힘주지 말고 가장 편한 키로 시작하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <blockquote className="rounded-2xl bg-primary/5 p-5 text-xl font-semibold leading-9 tracking-tight">
                “가볍게 노래 한 소절을 불러주세요.
                <br />
                애국가, 생일축하 노래 등 상관없어요.”
              </blockquote>
              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-xl border p-3">
                  <strong className="block text-foreground">10–60초</strong>짧은 한 소절이면 충분해요.
                </div>
                <div className="rounded-xl border p-3">
                  <strong className="block text-foreground">반주 없이</strong>목소리만 또렷하게 녹음해요.
                </div>
                <div className="rounded-xl border p-3">
                  <strong className="block text-foreground">편안하게</strong>최고음에 무리하지 마세요.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>테스트 녹음</CardTitle>
              <CardDescription>녹음 중인 파형을 확인할 수 있으며 60초가 되면 자동으로 종료됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {preparingAudio ? (
                <div className="rounded-2xl border p-6 text-center">
                  <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-medium">첫 음부터 최대 60초를 압축하는 중…</p>
                  <p className="mt-1 text-xs text-muted-foreground">{Math.round(preparationProgress * 100)}%</p>
                </div>
              ) : audioFile && audioUrl ? (
                <div className="rounded-2xl border p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
                      <FileAudio className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                        {audioDuration !== null ? ` · 약 ${Math.ceil(audioDuration)}초` : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium text-primary">업로드할 60초 이하 압축 오디오</p>
                    </div>
                  </div>
                  <AudioWaveformPlayer className="mt-4" label="제출할 보컬 녹음" src={audioUrl} />
                  <Button className="mt-3 w-full" disabled={analysisBusy} onClick={() => void analyzeAudio()}>
                    {analysisBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Activity className="size-4" />}
                    {analysisBusy
                      ? analysisJobStatus === "pending"
                        ? "분석 대기 중…"
                        : "백그라운드 분석 중…"
                      : "내 보컬 프로필 만들기"}
                  </Button>
                  <Button className="mt-1 w-full" disabled={analysisBusy} onClick={resetAudio} variant="ghost">
                    <RotateCcw className="size-4" /> 다시 선택
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  <VocalProfileRecorder
                    disabled={analysisBusy}
                    onComplete={completeRecording}
                    onError={recordingError}
                  />
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium hover:bg-muted/50">
                    <Upload className="size-4" /> 오디오 파일 업로드
                    <input
                      accept={ACCEPTED_AUDIO}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = "";
                        void selectFile(file);
                      }}
                      type="file"
                    />
                  </label>
                  <p className="text-center text-xs text-muted-foreground">WAV, MP3, M4A, WebM · 최대 25MB / 60초</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {analysisJobId ? (
          <section aria-live="polite" className="mt-6 rounded-2xl border bg-muted/35 p-5">
            <div className="flex items-center gap-3">
              <LoaderCircle className="size-5 animate-spin text-primary" />
              <div>
                <h2 className="font-semibold">
                  {analysisJobStatus === "pending" ? "보컬 분석 대기 중" : "보컬 프로필을 분석하는 중"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  페이지를 닫아도 서버에서 계속 진행되며, 다시 접속하면 이 작업을 이어서 확인합니다.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {analysisError ? (
          <section aria-live="assertive" className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <h2 className="font-semibold">
                  {ERROR_GUIDANCE[analysisError.reasonCode]?.title ?? "분석을 완료하지 못했어요"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {ERROR_GUIDANCE[analysisError.reasonCode]?.action ?? "잠시 뒤 다시 시도해주세요."}
                </p>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">{analysisError.reasonCode}</p>
              </div>
            </div>
          </section>
        ) : null}

        {profile ? (
          <section aria-live="polite" className="mt-8">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="size-5" />
                    <span className="text-sm font-semibold">분석 완료</span>
                  </div>
                  <CardTitle className="mt-3 text-2xl">내 보컬 프로필</CardTitle>
                  <CardDescription className="mt-2">
                    이번 한 소절에서 관찰된 음정 분포입니다. 다른 곡을 부르면 결과가 달라질 수 있습니다.
                  </CardDescription>
                </div>
                <Button
                  aria-label="보컬 프로필 삭제"
                  disabled={deleting}
                  onClick={() => void deleteProfile()}
                  size="icon"
                  variant="ghost"
                >
                  {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <VocalProfileResults
                  profile={profile}
                  sourceAudioSrc={audioUrl ?? `/api/vocal-profiles/${profile.id}/audio`}
                />
                <p className="text-xs text-muted-foreground">
                  생성 {new Date(profile.createdAt).toLocaleString("ko-KR")} · 원본 만료{" "}
                  {profile.recording.expiresAt ? new Date(profile.recording.expiresAt).toLocaleString("ko-KR") : "-"}
                </p>
                <div className="rounded-xl bg-muted/55 p-4 text-xs leading-6 text-muted-foreground">
                  사용 권한이 있는 본인의 음성만 업로드하세요. 이 결과는 노래 추천을 위한 참고 측정값이며, 발성 능력이나
                  건강 상태를 진단하지 않습니다. 환경과 컨디션에 따라 달라질 수 있습니다.
                </div>
                <Button
                  className="w-full"
                  disabled={recommending}
                  onClick={() => void createRecommendations()}
                  size="lg"
                >
                  {recommending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {recommending ? "100곡을 비교하는 중…" : "100곡 추천 순위 보기"}
                  {!recommending ? <ArrowRight className="ml-auto size-4" /> : null}
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </main>
  );
}
