"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const BAR_COUNT = 72;

function fallbackPeaks(seed = 1) {
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.42) * 0.22;
    const texture = Math.sin((index + seed) * 1.73) * 0.16;
    return Math.max(0.14, Math.min(0.92, 0.48 + wave + texture));
  });
}

export function Waveform({
  file,
  active = false,
  quiet = false,
}: {
  file?: File | null;
  active?: boolean;
  quiet?: boolean;
}) {
  const initial = useMemo(() => fallbackPeaks(quiet ? 8 : 2), [quiet]);
  const [peaks, setPeaks] = useState(initial);

  useEffect(() => {
    if (!file) return;

    let cancelled = false;
    const readAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext;
        const context = new AudioContextClass();
        const buffer = await file.arrayBuffer();
        const decoded = await context.decodeAudioData(buffer.slice(0));
        const channel = decoded.getChannelData(0);
        const blockSize = Math.max(1, Math.floor(channel.length / BAR_COUNT));
        const next = Array.from({ length: BAR_COUNT }, (_, index) => {
          const start = index * blockSize;
          const end = Math.min(start + blockSize, channel.length);
          let sum = 0;
          for (let cursor = start; cursor < end; cursor += 1) {
            sum += Math.abs(channel[cursor]);
          }
          return Math.max(0.1, Math.min(1, (sum / Math.max(1, end - start)) * 5));
        });
        if (!cancelled) setPeaks(next);
        await context.close();
      } catch {
        if (!cancelled) setPeaks(fallbackPeaks(file.size % 19));
      }
    };

    void readAudio();
    return () => {
      cancelled = true;
    };
  }, [file, initial]);

  const displayPeaks = file ? peaks : initial;

  return (
    <div className="waveform" aria-hidden="true">
      {displayPeaks.map((peak, index) => (
        <span
          className={cn("waveform-bar", active && "waveform-bar-active")}
          key={index}
          style={{
            height: `${Math.round(peak * 100)}%`,
            animationDelay: active ? `${index * 18}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}
