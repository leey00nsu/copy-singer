"use client";

import { useWavesurfer } from "@wavesurfer/react";
import { Check, Mic, RotateCcw, Square, X } from "lucide-react";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  state: VocalProfileRecorderState;
  waveformRef?: RefObject<HTMLDivElement | null>;
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

export function RecorderSurface({
  disabled = false,
  elapsedMs,
  maxDurationMs,
  onCancel,
  onStart,
  onStop,
  state,
  waveformRef,
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
    <div className="border bg-background p-4 sm:p-5">
      <div
        aria-label={active ? "실시간 마이크 입력 파형" : "녹음 대기 파형"}
        className={cn(
          "relative flex min-h-32 items-center overflow-hidden border-y bg-muted/20 px-3 py-4",
          state === "recording" && "border-data-accent/40 bg-accent/35",
        )}
        ref={waveformRef}
        role="img"
      >
        {!waveformRef ? (
          <span aria-hidden="true" className="flex h-20 w-full items-center justify-center gap-1.5">
            {previewBars.map((height, index) => (
              <span
                className="w-1 rounded-full bg-data-accent/70"
                key={`${height}-${index}`}
                style={{ height: `${active ? height : Math.max(14, height * 0.35)}%` }}
              />
            ))}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p aria-live="polite" className="text-sm font-medium">
            {stateCopy}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">5초부터 분석 가능 · 10초 권장 · 60초 자동 종료</p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums">
          <span className="sr-only">녹음 시간 </span>
          {formatElapsed(elapsedMs)}
        </span>
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
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button onClick={onCancel} variant="outline">
            <X aria-hidden="true" className="size-4" /> 취소
          </Button>
          <Button onClick={onStop}>
            <Square aria-hidden="true" className="size-4" /> 녹음 완료
          </Button>
        </div>
      ) : state === "requesting_permission" ? (
        <Button className="mt-5 w-full" onClick={onCancel} variant="outline">
          <X aria-hidden="true" className="size-4" /> 권한 요청 취소
        </Button>
      ) : state === "stopping" ? (
        <Button className="mt-5 w-full" disabled>
          <Square aria-hidden="true" className="size-4" /> 녹음 정리 중
        </Button>
      ) : state === "ready" ? (
        <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-success-foreground">
          <Check aria-hidden="true" className="size-4" /> 녹음 준비 완료
        </div>
      ) : (
        <Button className="mt-5 w-full" disabled={disabled} onClick={onStart} size="lg">
          {state === "error" ? (
            <RotateCcw aria-hidden="true" className="size-4" />
          ) : (
            <Mic aria-hidden="true" className="size-4" />
          )}
          {state === "error" ? "마이크 다시 시도" : "마이크로 녹음"}
        </Button>
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);
  const stoppingRef = useRef(false);
  const canceledRef = useRef(false);
  const elapsedRef = useRef(0);
  const [state, setState] = useState<VocalProfileRecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const waveformColors = useMemo(
    () => ({
      cursor: themeColor("--primary", "black"),
      progress: themeColor("--data-accent", "slateblue"),
      wave: themeColor("--accent", "lightgray"),
    }),
    [],
  );
  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 104,
    waveColor: waveformColors.wave,
    progressColor: waveformColors.progress,
    cursorColor: waveformColors.cursor,
    barWidth: 3,
    barGap: 2,
    barRadius: 3,
    normalize: true,
    interact: false,
  });

  useEffect(() => onStateChange?.(state), [onStateChange, state]);

  useEffect(() => {
    if (!wavesurfer) return;
    const plugin = wavesurfer.registerPlugin(
      RecordPlugin.create({
        continuousWaveform: true,
        continuousWaveformDuration: maxDurationMs / 1_000,
        mediaRecorderTimeslice: 250,
        renderRecordedAudio: false,
      }),
    );
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
  }, [maxDurationMs, onComplete, onProgress, wavesurfer]);

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
      await plugin.startRecording({
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      });
      if (canceledRef.current) {
        if (plugin.isRecording()) plugin.stopRecording();
        plugin.stopMic();
        return;
      }
      setState("recording");
    } catch (error) {
      plugin.stopMic();
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
    setElapsedMs(0);
    elapsedRef.current = 0;
    setState("idle");
  }, []);

  return (
    <RecorderSurface
      disabled={disabled || !wavesurfer}
      elapsedMs={elapsedMs}
      maxDurationMs={maxDurationMs}
      onCancel={cancel}
      onStart={() => void start()}
      onStop={stop}
      state={state}
      waveformRef={containerRef}
    />
  );
}

export { MAX_VOCAL_PROFILE_RECORDING_MS, MIN_VOICE_SCAN_DURATION_MS, RECOMMENDED_VOICE_SCAN_DURATION_MS };
