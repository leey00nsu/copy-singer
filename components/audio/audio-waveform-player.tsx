"use client";

import { useWavesurfer } from "@wavesurfer/react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioSourceRange } from "@/lib/vocal-profile/reference-segments";
import { formatPlaybackTime } from "@/shared/lib/audio";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

export type AudioPlaybackSegment = {
  id: string;
  label: string;
  ranges: AudioSourceRange[];
};
const EMPTY_SEGMENTS: AudioPlaybackSegment[] = [];

type AudioWaveformPlayerProps = {
  src: string;
  label?: string;
  className?: string;
  segments?: AudioPlaybackSegment[];
};

export function AudioWaveformPlayer(props: AudioWaveformPlayerProps) {
  return <AudioWaveformPlayerInstance key={props.src} {...props} />;
}

function AudioWaveformPlayerInstance({
  src,
  label = "오디오",
  className,
  segments = EMPTY_SEGMENTS,
}: AudioWaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const activeRangeRef = useRef<{ segmentId: string; rangeIndex: number } | null>(null);
  const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    url: src,
    height: 72,
    waveColor: "#cbd5e1",
    progressColor: "#059669",
    cursorColor: "#047857",
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    normalize: true,
    interact: true,
    dragToSeek: true,
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
    const next = !muted;
    wavesurfer.setMuted(next);
    setMuted(next);
  }, [muted, wavesurfer]);

  const playSegment = useCallback(
    (segment: AudioPlaybackSegment) => {
      if (!wavesurfer || segment.ranges.length === 0) return;
      const first = segment.ranges[0]!;
      activeRangeRef.current = { segmentId: segment.id, rangeIndex: 0 };
      setActiveSegmentId(segment.id);
      setFinished(false);
      wavesurfer.setTime(first.startSeconds);
      void wavesurfer.play();
    },
    [wavesurfer],
  );

  return (
    <div className={cn("rounded-xl border bg-background p-3", className)}>
      {decodeFailed ? (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">파형을 불러오지 못해 기본 플레이어로 재생합니다.</p>
          {/* Audio-only singing samples do not have a meaningful caption track. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio aria-label={label} className="w-full" controls preload="metadata" src={src} />
        </div>
      ) : (
        <>
          <div
            aria-label={`${label} 파형. 클릭하거나 드래그하여 재생 위치를 이동할 수 있습니다.`}
            className="min-h-[72px] overflow-hidden rounded-lg bg-muted/30 px-2"
            ref={containerRef}
            role="img"
          />
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
              aria-label={muted ? `${label} 음소거 해제` : `${label} 음소거`}
              disabled={!isReady}
              onClick={toggleMuted}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </Button>
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
