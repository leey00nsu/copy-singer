"use client";

import { useWavesurfer } from "@wavesurfer/react";
import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MAX_VOCAL_PROFILE_RECORDING_MS, recorderExtension, shouldStopRecording } from "@/lib/audio/recording";

type RecorderState = "ready" | "starting" | "recording";

export function VocalProfileRecorder({
  disabled = false,
  maxDurationMs = MAX_VOCAL_PROFILE_RECORDING_MS,
  onComplete,
  onError,
  onProgress,
}: {
  disabled?: boolean;
  maxDurationMs?: number;
  onComplete: (file: File, durationMs: number) => void;
  onError: (error: unknown) => void;
  onProgress?: (elapsedMs: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);
  const stoppingRef = useRef(false);
  const elapsedRef = useRef(0);
  const [state, setState] = useState<RecorderState>("ready");
  const [elapsedMs, setElapsedMs] = useState(0);
  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 104,
    waveColor: "#a7f3d0",
    progressColor: "#059669",
    cursorColor: "#047857",
    barWidth: 3,
    barGap: 2,
    barRadius: 3,
    normalize: true,
    interact: false,
  });

  useEffect(() => {
    if (!wavesurfer) return;
    const plugin = wavesurfer.registerPlugin(
      RecordPlugin.create({
        continuousWaveform: true,
        continuousWaveformDuration: maxDurationMs / 1_000,
        mediaRecorderTimeslice: 250,
        renderRecordedAudio: true,
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
        plugin.stopRecording();
      }
    });
    const unsubscribeEnd = plugin.on("record-end", (blob) => {
      const duration = Math.min(elapsedRef.current, maxDurationMs);
      stoppingRef.current = false;
      setState("ready");
      plugin.stopMic();
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
    if (!plugin || disabled || state !== "ready") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError(new Error("MEDIA_RECORDER_UNAVAILABLE"));
      return;
    }
    setState("starting");
    setElapsedMs(0);
    elapsedRef.current = 0;
    stoppingRef.current = false;
    try {
      await plugin.startRecording({
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      });
      setState("recording");
    } catch (error) {
      plugin.stopMic();
      setState("ready");
      onError(error);
    }
  }, [disabled, onError, state]);

  const stop = useCallback(() => {
    const plugin = recordPluginRef.current;
    if (!plugin?.isRecording() || stoppingRef.current) return;
    stoppingRef.current = true;
    plugin.stopRecording();
  }, []);

  const active = state === "starting" || state === "recording";
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div
        aria-label={active ? "실시간 마이크 입력 파형" : "녹음 대기 파형"}
        className="overflow-hidden rounded-xl bg-background px-3 py-2"
        ref={containerRef}
        role="img"
      />
      {active ? (
        <div className="mt-4 text-center">
          <p aria-live="polite" className="font-medium">
            {state === "starting" ? "마이크를 시작하는 중…" : "노래를 편안하게 이어가세요"}
          </p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {(elapsedMs / 1_000).toFixed(1)} / {(maxDurationMs / 1_000).toFixed(1)}초
          </p>
          <Progress className="mt-4" value={(elapsedMs / maxDurationMs) * 100} />
          <Button className="mt-4" disabled={state !== "recording"} onClick={stop} variant="outline">
            <Square className="size-4" /> 녹음 중지
          </Button>
        </div>
      ) : (
        <Button className="mt-4 w-full" disabled={disabled || !wavesurfer} onClick={() => void start()} size="lg">
          <Mic className="size-4" /> 마이크로 녹음
        </Button>
      )}
    </div>
  );
}
