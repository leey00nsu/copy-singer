"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileAudio, LoaderCircle, Mic, RotateCcw, Sparkles, Square, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LongAudioDialog } from "@/components/long-audio-dialog";
import { Progress } from "@/components/ui/progress";
import { VocalProfileResults } from "@/components/vocal-profile-results";
import { isLongProfileAudio, readAudioDuration } from "@/lib/vocal-profile/audio-file";
import type { VocalProfileError, VocalProfileResponse } from "@/lib/vocal-profile/contract";

const MAX_PROFILE_AUDIO_BYTES = 25 * 1024 * 1024;
const ACCEPTED_AUDIO = ".wav,.mp3,.m4a,.webm,audio/wav,audio/mpeg,audio/mp4,audio/webm";

type CapturePhase = "idle" | "recording";
type ServiceHealth = "checking" | "ok" | "unavailable";
const RECOMMENDED_RECORDING_MS = 30_000;

const ERROR_GUIDANCE: Record<string, { title: string; action: string }> = {
  TOO_SHORT: { title: "녹음이 너무 짧아요", action: "5초 이상 노래한 뒤 다시 시도해주세요." },
  TOO_LONG: { title: "녹음이 너무 길어요", action: "파일을 다시 선택한 뒤 자동 자르기에 동의해주세요." },
  TOO_SILENT: { title: "목소리가 너무 작아요", action: "마이크에 조금 가까이 다가가 반주 없이 더 크게 불러주세요." },
  EXCESSIVE_CLIPPING: { title: "소리가 찌그러졌어요", action: "마이크에서 조금 멀어지거나 입력 음량을 낮춰주세요." },
  LOW_VOICED_RATIO: { title: "노래 음정을 충분히 찾지 못했어요", action: "말소리보다 모음 ‘아’로 길게, 반주 없이 다시 불러주세요." },
  PAYLOAD_TOO_LARGE: { title: "파일이 너무 커요", action: "25MB 이하 파일을 사용해주세요." },
  UNSUPPORTED_AUDIO: { title: "지원하지 않는 오디오예요", action: "WAV, MP3, M4A 또는 WebM 파일을 사용해주세요." },
  INVALID_SEGMENTS: { title: "안내 녹음 구간이 올바르지 않아요", action: "새 안내 녹음을 만든 뒤 다시 분석해주세요." },
  ANALYZER_UNAVAILABLE: { title: "로컬 분석기에 연결할 수 없어요", action: "Docker analyzer가 실행 중인지 확인한 뒤 다시 시도해주세요." },
  ANALYZER_NOT_CONFIGURED: { title: "분석기 주소가 설정되지 않았어요", action: "VOCAL_PROFILE_API_URL 환경 변수를 확인해주세요." },
  PROFILE_SAVE_FAILED: { title: "분석 결과를 저장하지 못했어요", action: "PostgreSQL 연결을 확인한 뒤 다시 시도해주세요." },
};

function profileError(value: unknown): VocalProfileError {
  if (value && typeof value === "object" && "reasonCode" in value) {
    const candidate = value as Partial<VocalProfileError>;
    return { reasonCode: String(candidate.reasonCode), detail: String(candidate.detail ?? ""), retryable: candidate.retryable !== false };
  }
  return { reasonCode: "ANALYSIS_FAILED", detail: "Unknown analysis error.", retryable: true };
}

function chooseRecorderMimeType() {
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extensionForMimeType(mimeType: string) {
  return mimeType.includes("mp4") ? "m4a" : "webm";
}

export function VocalProfileWorkbench() {
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [pendingLongFile, setPendingLongFile] = useState<File | null>(null);
  const [pendingLongDuration, setPendingLongDuration] = useState<number | null>(null);
  const [trimToMaxDuration, setTrimToMaxDuration] = useState(false);
  const [health, setHealth] = useState<ServiceHealth>("checking");
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [profile, setProfile] = useState<VocalProfileResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<VocalProfileError | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timersRef = useRef<number[]>([]);
  const audioUrl = useMemo(() => (audioFile ? URL.createObjectURL(audioFile) : null), [audioFile]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const closeStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      clearTimers();
      closeStream();
    };
  }, [clearTimers, closeStream]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/vocal-profiles/health", { cache: "no-store", signal: controller.signal })
      .then((response) => setHealth(response.ok ? "ok" : "unavailable"))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setHealth("unavailable");
      });
    return () => controller.abort();
  }, []);

  const resetAudio = () => {
    setAudioFile(null);
    setAudioDuration(null);
    setPendingLongFile(null);
    setPendingLongDuration(null);
    setTrimToMaxDuration(false);
    setAnalysisError(null);
    setElapsedMs(0);
    setPhase("idle");
  };

  const finishRecording = useCallback(() => {
    clearTimers();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setPhase("idle");
    closeStream();
  }, [clearTimers, closeStream]);

  const beginRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("이 브라우저는 마이크 녹음을 지원하지 않습니다. 파일 업로드를 사용해주세요.");
      return;
    }
    resetAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const mimeType = chooseRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        if (blob.size > 0) {
          setAudioFile(new File([blob], `song-verse-vocal-profile.${extensionForMimeType(finalType)}`, { type: finalType }));
          setAudioDuration(null);
          setTrimToMaxDuration(false);
          toast.success("테스트 녹음이 준비됐습니다.");
        }
        recorderRef.current = null;
      };

      recorder.start(500);
      setPhase("recording");
      setElapsedMs(0);
      const startedAt = performance.now();
      const tick = () => {
        const elapsed = Math.min(performance.now() - startedAt, RECOMMENDED_RECORDING_MS);
        setElapsedMs(elapsed);
        if (elapsed < RECOMMENDED_RECORDING_MS) timersRef.current.push(window.setTimeout(tick, 100));
        else finishRecording();
      };
      tick();
    } catch (error) {
      closeStream();
      setPhase("idle");
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      toast.error(denied ? "마이크 권한이 거부됐습니다. 권한을 허용하거나 파일을 업로드해주세요." : "마이크를 시작하지 못했습니다.");
    }
  };

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
    setAudioFile(file);
    setAudioDuration(duration);
    setTrimToMaxDuration(false);
    setPhase("idle");
    setAnalysisError(null);
  };

  const cancelLongAudio = useCallback(() => {
    setPendingLongFile(null);
    setPendingLongDuration(null);
  }, []);

  const confirmLongAudio = () => {
    if (!pendingLongFile) return;
    setAudioFile(pendingLongFile);
    setAudioDuration(pendingLongDuration);
    setTrimToMaxDuration(true);
    setPendingLongFile(null);
    setPendingLongDuration(null);
    setPhase("idle");
    setAnalysisError(null);
  };

  const analyzeAudio = async () => {
    if (!audioFile || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);
    const body = new FormData();
    body.append("audio", audioFile, audioFile.name);
    if (trimToMaxDuration) body.append("trim_to_max_duration", "true");
    try {
      const response = await fetch("/api/vocal-profiles", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw profileError(payload);
      setProfile(payload as VocalProfileResponse);
      setHealth("ok");
      toast.success("보컬 프로필을 만들었습니다.");
    } catch (error) {
      setAnalysisError(profileError(error));
    } finally {
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
      setTrimToMaxDuration(false);
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
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; error?: { code?: string; message?: string; retryable?: boolean } }
        | null;
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

  const busy = phase !== "idle";
  const progress = (elapsedMs / RECOMMENDED_RECORDING_MS) * 100;

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
            <span className="brand-mark"><Mic className="size-4" /></span>
            <div><p className="text-sm font-semibold">Copy Singer</p><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Vocal profile lab</p></div>
          </div>
          <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/"><ArrowLeft className="size-4" /> 처음으로</Link>
        </div>
      </header>

      <div className="page-shell py-10 sm:py-14">
        <section className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Step 1 · 내 음역 측정</Badge>
            <Badge className="gap-1.5" variant={health === "ok" ? "outline" : "secondary"}>
              {health === "checking" ? <LoaderCircle className="size-3 animate-spin" /> : <Activity className="size-3" />}
              {health === "checking" ? "분석기 확인 중" : health === "ok" ? "로컬 분석기 준비됨" : "분석기 연결 필요"}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">노래 한 소절로,<br />내 목소리의 기준점을 만드세요.</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">정해진 음계 없이 평소처럼 편안하게 부르면 됩니다. 결과는 이 녹음에서 관찰된 추천용 측정값이며 의료적 진단이 아닙니다.</p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <Card>
            <CardHeader><CardTitle>무엇을 부르면 되나요?</CardTitle><CardDescription>잘 부르려고 힘주지 말고 가장 편한 키로 시작하세요.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <blockquote className="rounded-2xl bg-primary/5 p-5 text-xl font-semibold leading-9 tracking-tight">“가볍게 노래 한 소절을 불러주세요.<br />애국가, 생일축하 노래 등 상관없어요.”</blockquote>
              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-xl border p-3"><strong className="block text-foreground">10–30초</strong>짧은 한 소절이면 충분해요.</div>
                <div className="rounded-xl border p-3"><strong className="block text-foreground">반주 없이</strong>목소리만 또렷하게 녹음해요.</div>
                <div className="rounded-xl border p-3"><strong className="block text-foreground">편안하게</strong>최고음에 무리하지 마세요.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>테스트 녹음</CardTitle><CardDescription>직접 멈추거나 30초가 되면 자동으로 종료됩니다.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {busy ? (
                <div className="rounded-2xl border bg-muted/35 p-5 text-center">
                  <p aria-live="polite" className="text-lg font-semibold">노래를 편안하게 이어가세요</p>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">{(elapsedMs / 1000).toFixed(1)} / 30.0초</p>
                  <Progress className="mt-5" value={progress} />
                  <Button className="mt-5" onClick={finishRecording} variant="outline"><Square className="size-4" /> 녹음 중지</Button>
                </div>
              ) : audioFile && audioUrl ? (
                <div className="rounded-2xl border p-4">
                  <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-secondary"><FileAudio className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{audioFile.name}</p><p className="text-xs text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(1)} MB{audioDuration !== null ? ` · 약 ${Math.ceil(audioDuration)}초` : ""}</p>{trimToMaxDuration ? <p className="mt-1 text-xs font-medium text-primary">첫 음부터 최대 60초 자동 자르기</p> : null}</div></div>
                  {/* Audio-only user recording does not have a meaningful caption track. */}
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio className="mt-4 w-full" controls src={audioUrl} />
                  <Button className="mt-3 w-full" disabled={analyzing} onClick={() => void analyzeAudio()}>
                    {analyzing ? <LoaderCircle className="size-4 animate-spin" /> : <Activity className="size-4" />}
                    {analyzing ? "음역을 분석하는 중…" : "내 보컬 프로필 만들기"}
                  </Button>
                  <Button className="mt-1 w-full" disabled={analyzing} onClick={resetAudio} variant="ghost"><RotateCcw className="size-4" /> 다시 선택</Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Button onClick={() => void beginRecording()} size="lg"><Mic className="size-4" /> 마이크로 녹음</Button>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium hover:bg-muted/50"><Upload className="size-4" /> 오디오 파일 업로드<input accept={ACCEPTED_AUDIO} className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ""; void selectFile(file); }} type="file" /></label>
                  <p className="text-center text-xs text-muted-foreground">WAV, MP3, M4A, WebM · 최대 25MB / 60초</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {analysisError ? (
          <section aria-live="assertive" className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <h2 className="font-semibold">{ERROR_GUIDANCE[analysisError.reasonCode]?.title ?? "분석을 완료하지 못했어요"}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{ERROR_GUIDANCE[analysisError.reasonCode]?.action ?? "잠시 뒤 다시 시도해주세요."}</p>
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
                  <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="size-5" /><span className="text-sm font-semibold">분석 완료</span></div>
                  <CardTitle className="mt-3 text-2xl">내 보컬 프로필</CardTitle>
                  <CardDescription className="mt-2">이번 한 소절에서 관찰된 음정 분포입니다. 다른 곡을 부르면 결과가 달라질 수 있습니다.</CardDescription>
                </div>
                <Button aria-label="보컬 프로필 삭제" disabled={deleting} onClick={() => void deleteProfile()} size="icon" variant="ghost">
                  {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <VocalProfileResults profile={profile} />
                <p className="text-xs text-muted-foreground">생성 {new Date(profile.createdAt).toLocaleString("ko-KR")} · 원본 만료 {profile.recording.expiresAt ? new Date(profile.recording.expiresAt).toLocaleString("ko-KR") : "-"}</p>
                <div className="rounded-xl bg-muted/55 p-4 text-xs leading-6 text-muted-foreground">사용 권한이 있는 본인의 음성만 업로드하세요. 이 결과는 노래 추천을 위한 참고 측정값이며, 발성 능력이나 건강 상태를 진단하지 않습니다. 환경과 컨디션에 따라 달라질 수 있습니다.</div>
                <Button className="w-full" disabled={recommending} onClick={() => void createRecommendations()} size="lg">
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
