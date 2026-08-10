"use client";

import { Check, Mic, RotateCcw, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
import { MAX_VOCAL_PROFILE_RECORDING_MS, recorderExtension, shouldStopRecording } from "@/shared/lib/audio";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/shared/ui/progress";
import {
  MIN_VOICE_SCAN_DURATION_MS,
  RECOMMENDED_VOICE_SCAN_DURATION_MS,
  recordingMilestone,
} from "../model/voice-scan";

export type VocalProfileRecorderState = "idle" | "requesting_permission" | "recording" | "stopping" | "ready" | "error";

type RecorderSurfaceProps = {
  disabled?: boolean;
  elapsedMs: number;
  maxDurationMs: number;
  onCancel: () => void;
  onStart: () => void;
  onStop: () => void;
  microphoneStream?: MediaStream | null;
  state: VocalProfileRecorderState;
};

const previewBars = [34, 52, 42, 72, 58, 86, 64, 46, 76, 56, 38, 68, 50, 80, 60, 44, 70, 48, 62, 36];

function formatElapsed(elapsedMs: number) {
  const seconds = Math.max(0, elapsedMs) / 1_000;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

function themeColor(token: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function LiveMicrophoneWaveform({ stream }: { stream: MediaStream }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof AudioContext === "undefined") return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.58;
    source.connect(analyser);

    const samples = new Float32Array(analyser.fftSize);
    const history: number[] = [];
    const sampleIntervalMs = 45;
    const waveColor = themeColor("--data-accent-foreground", "#6757c8");
    const baselineColor = themeColor("--border", "#e5e7eb");
    let animationFrameId = 0;
    let lastSampleAt = 0;

    const render = (now: number) => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const maxBars = Math.max(18, Math.floor(width / 6));
      if (now - lastSampleAt >= sampleIntervalMs) {
        analyser.getFloatTimeDomainData(samples);
        let sumSquares = 0;
        let peak = 0;
        for (const sample of samples) {
          const absolute = Math.abs(sample);
          sumSquares += sample * sample;
          peak = Math.max(peak, absolute);
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        history.push(Math.min(1, Math.max(0.025, Math.max(rms * 5, peak * 1.5))));
        while (history.length > maxBars) history.shift();
        lastSampleAt = now;
      }

      const centerY = height / 2;
      context.beginPath();
      context.moveTo(0, centerY);
      context.lineTo(width, centerY);
      context.strokeStyle = baselineColor;
      context.lineWidth = 1;
      context.stroke();

      context.strokeStyle = waveColor;
      context.lineWidth = 3;
      context.lineCap = "round";
      const slotWidth = width / maxBars;
      history.forEach((amplitude, index) => {
        const x = slotWidth * index + slotWidth / 2;
        const barHeight = Math.max(4, amplitude * height * 0.82);
        context.beginPath();
        context.moveTo(x, centerY - barHeight / 2);
        context.lineTo(x, centerY + barHeight / 2);
        context.stroke();
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    void audioContext.resume();
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
    };
  }, [stream]);

  return <canvas className="h-28 w-full" ref={canvasRef} />;
}

export function RecorderSurface({
  disabled = false,
  elapsedMs,
  maxDurationMs,
  microphoneStream = null,
  onCancel,
  onStart,
  onStop,
  state,
}: RecorderSurfaceProps) {
  const active = state === "requesting_permission" || state === "recording" || state === "stopping";
  const milestone = recordingMilestone(elapsedMs);
  const stateCopy =
    state === "requesting_permission"
      ? "마이크 권한을 확인하는 중…"
      : state === "recording"
        ? milestone === "minimum"
          ? "최소 5초까지 편안하게 불러주세요"
          : milestone === "analyzable"
            ? "분석할 수 있어요 · 10초 녹음을 권장해요"
            : "권장 녹음 시간을 채웠어요"
        : state === "stopping"
          ? "녹음을 안전하게 마치는 중…"
          : state === "ready"
            ? "녹음을 준비했어요"
            : state === "error"
              ? "마이크 상태를 확인해주세요"
              : "마이크로 바로 시작할 수 있어요";

  return (
    <div className="flex min-h-[28rem] flex-col bg-background px-1 py-2 sm:px-3 sm:py-4">
      <div
        aria-label={active ? "실시간 마이크 입력 파형" : "녹음 대기 파형"}
        className={cn(
          "relative flex min-h-48 items-center overflow-hidden border-y border-border/70 px-4 py-8",
          state === "recording" && "border-data-accent/35 bg-data-accent/[0.025]",
        )}
        role="img"
      >
        {active && microphoneStream ? (
          <LiveMicrophoneWaveform stream={microphoneStream} />
        ) : (
          <span aria-hidden="true" className="flex h-20 w-full items-center justify-center gap-1.5">
            {previewBars.map((height, index) => (
              <span
                className="w-1 rounded-full bg-data-accent/70"
                key={`${height}-${index}`}
                style={{ height: `${active ? height : Math.max(14, height * 0.35)}%` }}
              />
            ))}
          </span>
        )}
      </div>

      <div className="mt-6 text-center">
        <span className="font-mono text-sm tabular-nums">
          <span className="sr-only">녹음 시간 </span>
          {formatElapsed(elapsedMs)}
        </span>
        <p aria-live="polite" className="mt-3 text-sm font-medium">
          {stateCopy}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">5초부터 분석 가능 · 10초 권장 · 60초 자동 종료</p>
      </div>

      {active || elapsedMs > 0 ? (
        <Progress
          aria-label="최대 60초 녹음 진행"
          className="mt-4"
          value={Math.min(100, (elapsedMs / maxDurationMs) * 100)}
        >
          <ProgressLabel>{milestone === "recommended" ? "권장 시간 충족" : "권장 10초"}</ProgressLabel>
          <ProgressValue>{() => `${Math.min(60, Math.floor(elapsedMs / 1_000))}초`}</ProgressValue>
        </Progress>
      ) : null}

      {state === "recording" ? (
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button aria-label="녹음 취소" className="rounded-full" onClick={onCancel} size="icon-lg" variant="outline">
            <X aria-hidden="true" className="size-4" />
          </Button>
          <Button aria-label="녹음 완료" className="size-14 rounded-full" onClick={onStop} size="icon-lg">
            <Square aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : state === "requesting_permission" ? (
        <div className="mt-7 flex justify-center">
          <Button onClick={onCancel} variant="outline">
            <X aria-hidden="true" className="size-4" /> 권한 요청 취소
          </Button>
        </div>
      ) : state === "stopping" ? (
        <div className="mt-7 flex justify-center">
          <Button className="size-14 rounded-full" disabled size="icon-lg">
            <Square aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : state === "ready" ? (
        <div className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-success-foreground">
          <Check aria-hidden="true" className="size-4" /> 녹음 준비 완료
        </div>
      ) : (
        <div className="mt-7 flex flex-col items-center gap-3">
          <Button
            aria-label={state === "error" ? "마이크 다시 시도" : "마이크로 녹음 시작"}
            className="size-14 rounded-full"
            disabled={disabled}
            onClick={onStart}
            size="icon-lg"
          >
            {state === "error" ? (
              <RotateCcw aria-hidden="true" className="size-5" />
            ) : (
              <Mic aria-hidden="true" className="size-5" />
            )}
          </Button>
          <p className="text-xs font-medium">{state === "error" ? "마이크 다시 시도" : "마이크 녹음"}</p>
        </div>
      )}
    </div>
  );
}

export function VocalProfileRecorder({
  disabled = false,
  maxDurationMs = MAX_VOCAL_PROFILE_RECORDING_MS,
  onComplete,
  onError,
  onProgress,
  onStateChange,
}: {
  disabled?: boolean;
  maxDurationMs?: number;
  onComplete: (file: File, durationMs: number) => void;
  onError: (error: unknown) => void;
  onProgress?: (elapsedMs: number) => void;
  onStateChange?: (state: VocalProfileRecorderState) => void;
}) {
  const recordPluginRef = useRef<RecordPlugin | null>(null);
  const stoppingRef = useRef(false);
  const canceledRef = useRef(false);
  const elapsedRef = useRef(0);
  const [state, setState] = useState<VocalProfileRecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);

  useEffect(() => onStateChange?.(state), [onStateChange, state]);

  useEffect(() => {
    const plugin = RecordPlugin.create({
      mediaRecorderTimeslice: 100,
      renderRecordedAudio: false,
    });
    recordPluginRef.current = plugin;
    const unsubscribeProgress = plugin.on("record-progress", (duration) => {
      const bounded = Math.min(duration, maxDurationMs);
      elapsedRef.current = bounded;
      setElapsedMs(bounded);
      onProgress?.(bounded);
      if (shouldStopRecording(duration, maxDurationMs) && !stoppingRef.current) {
        stoppingRef.current = true;
        setState("stopping");
        plugin.stopRecording();
      }
    });
    const unsubscribeEnd = plugin.on("record-end", (blob) => {
      const duration = Math.min(elapsedRef.current, maxDurationMs);
      const canceled = canceledRef.current;
      stoppingRef.current = false;
      canceledRef.current = false;
      plugin.stopMic();
      setMicrophoneStream(null);
      if (canceled) {
        setElapsedMs(0);
        elapsedRef.current = 0;
        setState("idle");
        return;
      }
      setState("ready");
      if (blob.size === 0) return;
      const mimeType = blob.type || "audio/webm";
      onComplete(
        new File([blob], `song-verse-vocal-profile.${recorderExtension(mimeType)}`, { type: mimeType }),
        duration,
      );
    });

    return () => {
      unsubscribeProgress();
      unsubscribeEnd();
      if (plugin.isRecording()) plugin.stopRecording();
      plugin.stopMic();
      plugin.destroy();
      if (recordPluginRef.current === plugin) recordPluginRef.current = null;
    };
  }, [maxDurationMs, onComplete, onProgress]);

  const start = useCallback(async () => {
    const plugin = recordPluginRef.current;
    if (!plugin || disabled || !["idle", "error"].includes(state)) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      onError(new Error("MEDIA_RECORDER_UNAVAILABLE"));
      return;
    }
    setState("requesting_permission");
    setElapsedMs(0);
    elapsedRef.current = 0;
    stoppingRef.current = false;
    canceledRef.current = false;
    try {
      const stream = await plugin.startMic({
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      });
      if (canceledRef.current) {
        plugin.stopMic();
        setMicrophoneStream(null);
        return;
      }
      setMicrophoneStream(stream);
      await plugin.startRecording();
      if (canceledRef.current) {
        if (plugin.isRecording()) plugin.stopRecording();
        plugin.stopMic();
        setMicrophoneStream(null);
        return;
      }
      setState("recording");
    } catch (error) {
      plugin.stopMic();
      setMicrophoneStream(null);
      if (canceledRef.current) {
        setState("idle");
        return;
      }
      setState("error");
      onError(error);
    }
  }, [disabled, onError, state]);

  const stop = useCallback(() => {
    const plugin = recordPluginRef.current;
    if (!plugin?.isRecording() || stoppingRef.current) return;
    stoppingRef.current = true;
    setState("stopping");
    plugin.stopRecording();
  }, []);

  const cancel = useCallback(() => {
    const plugin = recordPluginRef.current;
    if (!plugin) return;
    canceledRef.current = true;
    if (plugin.isRecording() && !stoppingRef.current) {
      stoppingRef.current = true;
      setState("stopping");
      plugin.stopRecording();
      return;
    }
    plugin.stopMic();
    setMicrophoneStream(null);
    setElapsedMs(0);
    elapsedRef.current = 0;
    setState("idle");
  }, []);

  return (
    <RecorderSurface
      disabled={disabled}
      elapsedMs={elapsedMs}
      maxDurationMs={maxDurationMs}
      microphoneStream={microphoneStream}
      onCancel={cancel}
      onStart={() => void start()}
      onStop={stop}
      state={state}
    />
  );
}

export { MAX_VOCAL_PROFILE_RECORDING_MS, MIN_VOICE_SCAN_DURATION_MS, RECOMMENDED_VOICE_SCAN_DURATION_MS };
