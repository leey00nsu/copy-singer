"use client";

import { useWavesurfer } from "@wavesurfer/react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { formatPlaybackTime } from "@/shared/lib/audio";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Slider } from "@/shared/ui/slider";

export type AudioPlaybackRange = {
  startSeconds: number;
  endSeconds: number;
};

export type AudioPlaybackSegment = {
  id: string;
  label: string;
  ranges: AudioPlaybackRange[];
};
const EMPTY_SEGMENTS: AudioPlaybackSegment[] = [];
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

function themeColor(token: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

type AudioWaveformPlayerProps = {
  src: string;
  label?: string;
  className?: string;
  segments?: AudioPlaybackSegment[];
  waveformPeaks?: Array<Float32Array | number[]>;
  waveformDuration?: number;
};

export function AudioWaveformPlayer(props: AudioWaveformPlayerProps) {
  return <AudioWaveformPlayerInstance key={props.src} {...props} />;
}

function AudioWaveformPlayerInstance({
  src,
  label = "오디오",
  className,
  segments = EMPTY_SEGMENTS,
  waveformPeaks,
  waveformDuration,
}: AudioWaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const volumeLabelId = useId();
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [finished, setFinished] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const activeRangeRef = useRef<{ segmentId: string; rangeIndex: number } | null>(null);
  const lastAudibleVolumeRef = useRef(100);
  const waveformColors = useMemo(() => {
    const strong = themeColor("--data-accent-foreground", "#6757c8");
    return {
      cursor: strong,
      progress: [
        themeColor("--brand-violet", "#7c3aed"),
        themeColor("--brand-blue", "#3b82f6"),
        themeColor("--brand-pink", "#ec4899"),
      ],
      wave: [themeColor("--brand-soft-violet", "#c4b5fd"), themeColor("--brand-soft-blue", "#bfdbfe")],
    };
  }, []);
  const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    url: src,
    height: 72,
    waveColor: waveformColors.wave,
    progressColor: waveformColors.progress,
    cursorColor: waveformColors.cursor,
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    normalize: true,
    interact: true,
    dragToSeek: true,
    peaks: waveformPeaks,
    duration: waveformDuration,
  });

  useEffect(() => {
    if (!wavesurfer) return;
    const unsubscribeReady = wavesurfer.on("ready", (nextDuration) => setDuration(nextDuration));
    const unsubscribeFinish = wavesurfer.on("finish", () => setFinished(true));
    const unsubscribeInteraction = wavesurfer.on("interaction", () => {
      activeRangeRef.current = null;
      setActiveSegmentId(null);
      setFinished(false);
    });
    const unsubscribePlay = wavesurfer.on("play", () => setFinished(false));
    const unsubscribeError = wavesurfer.on("error", () => setDecodeFailed(true));
    const unsubscribeTime = wavesurfer.on("timeupdate", (time) => {
      const active = activeRangeRef.current;
      if (!active) return;
      const segment = segments.find((candidate) => candidate.id === active.segmentId);
      const range = segment?.ranges[active.rangeIndex];
      if (!segment || !range || time < range.endSeconds - 0.03) return;
      const nextIndex = active.rangeIndex + 1;
      const nextRange = segment.ranges[nextIndex];
      if (nextRange) {
        activeRangeRef.current = { ...active, rangeIndex: nextIndex };
        wavesurfer.setTime(nextRange.startSeconds);
      } else {
        activeRangeRef.current = null;
        setActiveSegmentId(null);
        setFinished(true);
        wavesurfer.pause();
      }
    });
    return () => {
      unsubscribeReady();
      unsubscribeFinish();
      unsubscribeInteraction();
      unsubscribePlay();
      unsubscribeError();
      unsubscribeTime();
    };
  }, [segments, wavesurfer]);

  const togglePlayback = useCallback(() => {
    if (!wavesurfer) return;
    activeRangeRef.current = null;
    setActiveSegmentId(null);
    if (finished) {
      wavesurfer.setTime(0);
      void wavesurfer.play();
      return;
    }
    void wavesurfer.playPause();
  }, [finished, wavesurfer]);

  const restart = useCallback(() => {
    if (!wavesurfer) return;
    wavesurfer.setTime(0);
    void wavesurfer.play();
  }, [wavesurfer]);

  const toggleMuted = useCallback(() => {
    if (!wavesurfer) return;
    if (volume === 0) {
      const restoredVolume = lastAudibleVolumeRef.current;
      wavesurfer.setVolume(restoredVolume / 100);
      wavesurfer.setMuted(false);
      setVolume(restoredVolume);
      setMuted(false);
      return;
    }
    const next = !muted;
    wavesurfer.setMuted(next);
    setMuted(next);
  }, [muted, volume, wavesurfer]);

  const changeVolume = useCallback(
    (values: number | readonly number[]) => {
      if (!wavesurfer) return;
      const nextValue = typeof values === "number" ? values : values[0];
      const next = Math.min(100, Math.max(0, nextValue ?? volume));
      wavesurfer.setVolume(next / 100);
      if (next > 0) lastAudibleVolumeRef.current = next;
      if (muted) {
        wavesurfer.setMuted(false);
        setMuted(false);
      }
      setVolume(next);
    },
    [muted, volume, wavesurfer],
  );

  const changePlaybackRate = useCallback(
    (value: string | null) => {
      if (!wavesurfer || !value) return;
      const next = Number(value);
      if (!PLAYBACK_RATES.includes(next as (typeof PLAYBACK_RATES)[number])) return;
      wavesurfer.setPlaybackRate(next, true);
      setPlaybackRate(next);
    },
    [wavesurfer],
  );

  const playSegment = useCallback(
    (segment: AudioPlaybackSegment) => {
      if (!wavesurfer || segment.ranges.length === 0) return;
      const first = segment.ranges[0];
      if (!first) return;
      activeRangeRef.current = { segmentId: segment.id, rangeIndex: 0 };
      setActiveSegmentId(segment.id);
      setFinished(false);
      wavesurfer.setTime(first.startSeconds);
      void wavesurfer.play();
    },
    [wavesurfer],
  );

  return (
    <div
      className={cn("rounded-xl border bg-background p-3", className)}
      data-audio-muted={muted ? "true" : "false"}
      data-audio-playback-rate={playbackRate}
      data-audio-player="true"
      data-audio-volume={volume}
    >
      {decodeFailed ? (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">파형을 불러오지 못해 기본 플레이어로 재생해요.</p>
          {/* Audio-only singing samples do not have a meaningful caption track. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio aria-label={label} className="w-full" controls preload="metadata" src={src} />
        </div>
      ) : (
        <>
          <div
            className="audio-waveform-visual"
            data-audio-waveform-ready={isReady ? "true" : "false"}
            data-audio-waveform-surface="true"
          >
            <div
              aria-busy={!isReady}
              aria-label={`${label} 파형. 클릭하거나 드래그해 재생 위치를 이동할 수 있어요. 좌우 화살표는 5초 이동, Home/End는 처음과 끝으로 이동해요.`}
              aria-valuemax={Math.round(duration)}
              aria-valuemin={0}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(Math.round(duration))}`}
              className="audio-waveform-canvas"
              data-audio-waveform="brand"
              data-waveform-progress-gradient="violet-blue-pink"
              onKeyDown={(event) => {
                if (!wavesurfer || !isReady) return;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  wavesurfer.setTime(Math.max(0, currentTime - 5));
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  wavesurfer.setTime(Math.min(duration, currentTime + 5));
                } else if (event.key === "Home") {
                  event.preventDefault();
                  wavesurfer.setTime(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  wavesurfer.setTime(duration);
                } else if (event.key === " ") {
                  event.preventDefault();
                  togglePlayback();
                }
              }}
              ref={containerRef}
              role="slider"
              tabIndex={isReady ? 0 : -1}
            />
            <div aria-hidden="true" className="audio-waveform-skeleton" data-audio-waveform-skeleton="true" />
            {!isReady ? (
              <span className="sr-only" role="status">
                {label} 파형 불러오는 중
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              aria-label={isPlaying ? `${label} 일시정지` : `${label} 재생`}
              disabled={!isReady}
              onClick={togglePlayback}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              {isPlaying ? (
                <Pause className="size-3.5" />
              ) : finished ? (
                <RotateCcw className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
            </Button>
            <span aria-live="off" className="min-w-24 font-mono text-xs text-muted-foreground">
              {formatPlaybackTime(currentTime)} / {formatPlaybackTime(Math.round(duration))}
            </span>
            <span className="h-px flex-1 bg-border" />
            {finished ? (
              <Button
                aria-label={`${label} 처음부터 재생`}
                onClick={restart}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            ) : null}
            <Button
              aria-label={muted || volume === 0 ? `${label} 음소거 해제` : `${label} 음소거`}
              disabled={!isReady}
              onClick={toggleMuted}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {muted || volume === 0 ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </Button>
          </div>
          <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-[auto_minmax(12rem,1fr)] sm:items-center sm:gap-5">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <span className="text-xs font-medium text-muted-foreground">재생 속도</span>
              <Select onValueChange={changePlaybackRate} value={String(playbackRate)}>
                <SelectTrigger aria-label={`${label} 재생 속도`} disabled={!isReady} size="sm">
                  <SelectValue>{(value) => `${value}×`}</SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {PLAYBACK_RATES.map((rate) => (
                    <SelectItem key={rate} value={String(rate)}>
                      {rate}×
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[auto_minmax(6rem,1fr)_3rem] items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground" id={volumeLabelId}>
                <span className="sr-only">{label} </span>음량
              </span>
              <Slider
                aria-labelledby={volumeLabelId}
                disabled={!isReady}
                max={100}
                min={0}
                onValueChange={changeVolume}
                step={5}
                value={[volume]}
              />
              <span aria-live="off" className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                {volume}%
              </span>
            </div>
          </div>
          {segments.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {segments.map((segment) => (
                <Button
                  aria-pressed={activeSegmentId === segment.id}
                  disabled={!isReady}
                  key={segment.id}
                  onClick={() => playSegment(segment)}
                  size="sm"
                  type="button"
                  variant={activeSegmentId === segment.id ? "default" : "outline"}
                >
                  <Play className="size-3.5" /> {segment.label}
                </Button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
