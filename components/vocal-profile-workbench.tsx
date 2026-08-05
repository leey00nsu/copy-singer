"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileAudio, Headphones, LoaderCircle, Mic, Play, RotateCcw, Square, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  GUIDE_COUNT_IN_MS,
  GUIDE_MELODY_DURATION_MS,
  GUIDE_NOTE_DURATION_MS,
  GUIDE_PATTERN,
  GUIDE_PRESETS,
  GUIDE_RECORDING_DURATION_MS,
  GUIDE_TRANSITION_DURATION_MS,
  type GuidePreset,
  playGuideMelody,
} from "@/lib/vocal-profile/guide-melody";

const MAX_PROFILE_AUDIO_BYTES = 25 * 1024 * 1024;
const ACCEPTED_AUDIO = ".wav,.mp3,.m4a,.webm,audio/wav,audio/mpeg,audio/mp4,audio/webm";

type CapturePhase = "idle" | "count-in" | "melody" | "transition" | "glissando";

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
  const [preset, setPreset] = useState<GuidePreset>("medium");
  const [previewing, setPreviewing] = useState(false);
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordedWithGuide, setRecordedWithGuide] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timersRef = useRef<number[]>([]);
  const previewStopRef = useRef<(() => void) | null>(null);
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
      previewStopRef.current?.();
    };
  }, [clearTimers, closeStream]);

  const resetAudio = () => {
    setAudioFile(null);
    setRecordedWithGuide(false);
    setElapsedMs(0);
    setPhase("idle");
  };

  const previewGuide = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const playback = playGuideMelody(preset);
      previewStopRef.current = playback.stop;
      await playback.finished;
    } catch {
      toast.error("브라우저에서 안내 멜로디를 재생하지 못했습니다.");
    } finally {
      previewStopRef.current = null;
      setPreviewing(false);
    }
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
          setAudioFile(new File([blob], `guided-vocal-profile.${extensionForMimeType(finalType)}`, { type: finalType }));
          setRecordedWithGuide(true);
          toast.success("테스트 녹음이 준비됐습니다.");
        }
        recorderRef.current = null;
      };

      setPhase("count-in");
      setElapsedMs(0);
      const startTimer = window.setTimeout(() => {
        recorder.start(500);
        const startedAt = performance.now();
        setPhase("melody");
        const tick = () => {
          const elapsed = Math.min(performance.now() - startedAt, GUIDE_RECORDING_DURATION_MS);
          setElapsedMs(elapsed);
          if (elapsed < GUIDE_MELODY_DURATION_MS) setPhase("melody");
          else if (elapsed < GUIDE_MELODY_DURATION_MS + GUIDE_TRANSITION_DURATION_MS) setPhase("transition");
          else setPhase("glissando");
          if (elapsed < GUIDE_RECORDING_DURATION_MS) {
            timersRef.current.push(window.setTimeout(tick, 100));
          } else {
            finishRecording();
          }
        };
        tick();
      }, GUIDE_COUNT_IN_MS);
      timersRef.current.push(startTimer);
    } catch (error) {
      closeStream();
      setPhase("idle");
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      toast.error(denied ? "마이크 권한이 거부됐습니다. 권한을 허용하거나 파일을 업로드해주세요." : "마이크를 시작하지 못했습니다.");
    }
  };

  const selectFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PROFILE_AUDIO_BYTES) {
      toast.error("테스트 오디오는 25MB 이하여야 합니다.");
      return;
    }
    setAudioFile(file);
    setRecordedWithGuide(false);
    setPhase("idle");
  };

  const activeNote = phase === "melody" ? Math.min(Math.floor(elapsedMs / GUIDE_NOTE_DURATION_MS), GUIDE_PATTERN.length - 1) : -1;
  const busy = phase !== "idle";
  const countInBeat = phase === "count-in" ? Math.min(4, Math.floor(elapsedMs / 750) + 1) : null;
  const progress = phase === "count-in" ? 0 : (elapsedMs / GUIDE_RECORDING_DURATION_MS) * 100;

  useEffect(() => {
    if (phase !== "count-in") return;
    const startedAt = performance.now();
    const tick = () => {
      setElapsedMs(Math.min(performance.now() - startedAt, GUIDE_COUNT_IN_MS));
      if (performance.now() - startedAt < GUIDE_COUNT_IN_MS) timersRef.current.push(window.setTimeout(tick, 100));
    };
    tick();
  }, [phase]);

  return (
    <main className="min-h-screen bg-background">
      <header className="site-header">
        <div className="page-shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="brand-mark"><Mic className="size-4" /></span>
            <div><p className="text-sm font-semibold">Copy Singer</p><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Vocal profile lab</p></div>
          </div>
          <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/"><ArrowLeft className="size-4" /> 음성 합성으로</Link>
        </div>
      </header>

      <div className="page-shell py-10 sm:py-14">
        <section className="max-w-2xl">
          <Badge variant="secondary">Step 1 · 내 음역 측정</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">짧게 따라 부르고,<br />내 목소리의 기준점을 만드세요.</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">가장 편한 키를 고른 뒤 안내 멜로디와 음역 슬라이드를 녹음합니다. 결과는 추천용 측정값이며 의료적 진단이 아닙니다.</p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <Card>
            <CardHeader><CardTitle>1. 편한 시작 키 선택</CardTitle><CardDescription>세 예시는 같은 멜로디이며 시작 음역만 다릅니다.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(GUIDE_PRESETS) as [GuidePreset, (typeof GUIDE_PRESETS)[GuidePreset]][]).map(([key, option]) => (
                  <button key={key} className={`rounded-xl border p-3 text-left transition ${preset === key ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`} disabled={busy || previewing} onClick={() => setPreset(key)} type="button">
                    <span className="block text-sm font-semibold">{option.label}</span><span className="mt-1 block font-mono text-xs text-muted-foreground">{option.range}</span>
                  </button>
                ))}
              </div>
              <Button className="w-full" disabled={busy || previewing} onClick={() => void previewGuide()} variant="outline">
                {previewing ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}{previewing ? "멜로디 재생 중…" : `${GUIDE_PRESETS[preset].label} 예시 듣기`}
              </Button>
              <div className="rounded-xl bg-muted/55 p-4 text-xs leading-6 text-muted-foreground"><Headphones className="mr-2 inline size-4" />예시를 먼저 들은 뒤 녹음에서는 화면만 따라갑니다. 안내음을 함께 들으려면 이어폰을 사용하세요.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. 테스트 녹음</CardTitle><CardDescription>4박 준비 후 약 21초간 자동으로 진행됩니다.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {busy ? (
                <div className="rounded-2xl border bg-muted/35 p-5 text-center">
                  <p aria-live="polite" className="text-lg font-semibold">
                    {phase === "count-in" ? `${countInBeat ?? 1} / 4 준비` : phase === "melody" ? "각 음을 ‘아’로 따라 부르세요" : phase === "transition" ? "숨을 고르고…" : "편한 음에서 낮게, 높게 슬라이드하세요"}
                  </p>
                  {phase === "melody" ? <div className="mt-5 flex items-end justify-center gap-1.5">{GUIDE_PATTERN.map((step, index) => <span aria-hidden className={`w-2 rounded-full transition-all ${index === activeNote ? "bg-primary" : "bg-border"}`} key={`${step}-${index}`} style={{ height: 12 + step * 2 }} />)}</div> : null}
                  <Progress className="mt-5" value={progress} />
                  <Button className="mt-5" onClick={finishRecording} variant="outline"><Square className="size-4" /> 녹음 중지</Button>
                </div>
              ) : audioFile && audioUrl ? (
                <div className="rounded-2xl border p-4">
                  <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-secondary"><FileAudio className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{audioFile.name}</p><p className="text-xs text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(1)} MB · {recordedWithGuide ? "안내 녹음" : "업로드 파일"}</p></div></div>
                  {/* Audio-only user recording does not have a meaningful caption track. */}
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio className="mt-4 w-full" controls src={audioUrl} />
                  <Button className="mt-3 w-full" onClick={resetAudio} variant="ghost"><RotateCcw className="size-4" /> 다시 선택</Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Button onClick={() => void beginRecording()} size="lg"><Mic className="size-4" /> 마이크로 녹음</Button>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium hover:bg-muted/50"><Upload className="size-4" /> 오디오 파일 업로드<input accept={ACCEPTED_AUDIO} className="sr-only" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} type="file" /></label>
                  <p className="text-center text-xs text-muted-foreground">WAV, MP3, M4A, WebM · 최대 25MB / 60초</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
