"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/shared/lib/cn";
import { VoiceOrb } from "@/shared/ui/voice-orb";

import styles from "./voice-signal-core.module.css";

type VoiceSignalMode = "idle" | "processing" | "recording" | "requesting" | "stopping";

type VoiceSignalCoreProps = {
  className?: string;
  forceFallback?: boolean;
  mode: VoiceSignalMode;
  stream?: MediaStream | null;
};

function VoiceSignalCore({ className, forceFallback = false, mode, stream = null }: VoiceSignalCoreProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || mode !== "recording" || !stream || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (typeof AudioContext === "undefined") return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.58;
    source.connect(analyser);

    const samples = new Float32Array(analyser.fftSize);
    const sampleIntervalMs = 45;
    let animationFrameId = 0;
    let lastSampleAt = 0;
    let level = 0.08;

    const sampleLevel = (now: number) => {
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
        const target = Math.min(1, Math.max(0.04, Math.max(rms * 5, peak * 1.5)));
        const smoothing = target > level ? 0.34 : 0.12;
        level += (target - level) * smoothing;
        root.style.setProperty("--signal-level", level.toFixed(3));
        lastSampleAt = now;
      }
      animationFrameId = requestAnimationFrame(sampleLevel);
    };

    void audioContext.resume();
    animationFrameId = requestAnimationFrame(sampleLevel);

    return () => {
      cancelAnimationFrame(animationFrameId);
      source.disconnect();
      analyser.disconnect();
      root.style.removeProperty("--signal-level");
      void audioContext.close();
    };
  }, [mode, stream]);

  const staticMode = mode === "idle" || mode === "requesting" || mode === "stopping";

  return (
    <div
      aria-hidden="true"
      className={cn(styles.root, styles[mode], className)}
      data-signal-mode={mode}
      data-testid="voice-signal-core"
      ref={rootRef}
    >
      <span className={styles.glow} />
      <VoiceOrb
        className={styles.orb}
        forceFallback={forceFallback || staticMode}
        hoverIntensity={0}
        hue={294}
        rotateOnHover={false}
      />
    </div>
  );
}

export type { VoiceSignalCoreProps, VoiceSignalMode };
export { VoiceSignalCore };
