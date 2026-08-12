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
  const waveformRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = waveformRef.current;
    if (!root || !canvas || mode !== "recording") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const brandViolet = rootStyles.getPropertyValue("--brand-violet").trim() || "#7c3aed";
    const brandBlue = rootStyles.getPropertyValue("--brand-blue").trim() || "#3b82f6";
    const brandPink = rootStyles.getPropertyValue("--brand-pink").trim() || "#ec4899";
    const bars: Array<{ height: number; x: number }> = [];
    const barWidth = 3;
    const barGap = 3;
    const step = barWidth + barGap;
    const scrollSpeed = 46;
    const fadeWidth = 32;
    const sampleIntervalMs = 45;
    let animationFrameId = 0;
    let lastSampleAt = 0;
    let lastFrameAt = 0;
    let level = 0.08;
    let analyser: AnalyserNode | null = null;
    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let samples: Float32Array<ArrayBuffer> | null = null;

    if (stream && typeof AudioContext !== "undefined" && !reducedMotion) {
      audioContext = new AudioContext();
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.58;
      source.connect(analyser);
      samples = new Float32Array(analyser.fftSize);
      void audioContext.resume();
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      bars.length = 0;
      for (let x = 0; x <= rect.width + step; x += step) {
        const normalized = x / Math.max(rect.width, 1);
        bars.push({ height: 0.07 + Math.sin(normalized * Math.PI * 4) ** 2 * 0.035, x });
      }
    };

    const renderWaveform = () => {
      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      const centerY = rect.height / 2;
      const brandGradient = context.createLinearGradient(0, 0, rect.width, 0);
      brandGradient.addColorStop(0, brandViolet);
      brandGradient.addColorStop(0.5, brandBlue);
      brandGradient.addColorStop(1, brandPink);
      context.fillStyle = brandGradient;

      for (const bar of bars) {
        if (bar.x + barWidth <= 0 || bar.x >= rect.width) continue;
        const barHeight = Math.max(4, bar.height * rect.height * 0.84);
        context.globalAlpha = 0.38 + bar.height * 0.62;
        context.beginPath();
        context.roundRect(bar.x, centerY - barHeight / 2, barWidth, barHeight, 2);
        context.fill();
      }

      if (rect.width > 0) {
        const edgeFade = context.createLinearGradient(0, 0, rect.width, 0);
        const fadePercent = Math.min(0.2, fadeWidth / rect.width);
        edgeFade.addColorStop(0, "rgba(255,255,255,1)");
        edgeFade.addColorStop(fadePercent, "rgba(255,255,255,0)");
        edgeFade.addColorStop(1 - fadePercent, "rgba(255,255,255,0)");
        edgeFade.addColorStop(1, "rgba(255,255,255,1)");
        context.globalCompositeOperation = "destination-out";
        context.globalAlpha = 1;
        context.fillStyle = edgeFade;
        context.fillRect(0, 0, rect.width, rect.height);
        context.globalCompositeOperation = "source-over";
      }
      context.globalAlpha = 1;
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      renderWaveform();
    });
    resizeObserver.observe(canvas);
    resizeCanvas();
    renderWaveform();

    const animate = (now: number) => {
      const deltaSeconds = lastFrameAt ? Math.min(0.05, (now - lastFrameAt) / 1000) : 0;
      lastFrameAt = now;

      if (analyser && samples && now - lastSampleAt >= sampleIntervalMs) {
        analyser.getFloatTimeDomainData(samples);
        let sumSquares = 0;
        let peak = 0;
        for (const sample of samples) {
          const absolute = Math.abs(sample);
          sumSquares += sample * sample;
          peak = Math.max(peak, absolute);
        }

        const rms = Math.sqrt(sumSquares / samples.length);
        const target = Math.min(1, Math.max(0.04, Math.max(rms * 8, peak * 2.6)));
        const smoothing = target > level ? 0.5 : 0.16;
        level += (target - level) * smoothing;
        root.style.setProperty("--signal-level", level.toFixed(3));
        lastSampleAt = now;
      }

      if (!reducedMotion) {
        for (const bar of bars) bar.x -= scrollSpeed * deltaSeconds;
        while (bars[0] && bars[0].x + barWidth < 0) bars.shift();
        const rect = canvas.getBoundingClientRect();
        while (!bars.at(-1) || (bars.at(-1)?.x ?? 0) < rect.width + step) {
          bars.push({ height: level, x: (bars.at(-1)?.x ?? rect.width) + step });
        }
      }

      renderWaveform();
      animationFrameId = requestAnimationFrame(animate);
    };

    if (!reducedMotion) animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      source?.disconnect();
      analyser?.disconnect();
      root.style.removeProperty("--signal-level");
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
    };
  }, [mode, stream]);

  const speed = mode === "processing" ? 1 : mode === "recording" ? 0.75 : mode === "requesting" ? 0.45 : 0.35;

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
        forceFallback={forceFallback}
        hoverIntensity={0}
        hue={294}
        rotateOnHover={false}
        speed={speed}
      />
      {mode === "recording" ? (
        <canvas
          className={styles.waveform}
          data-testid="recording-scrolling-waveform"
          data-waveform-gradient="brand"
          data-waveform-source="elevenlabs-ui-scrolling-waveform"
          ref={waveformRef}
        />
      ) : null}
    </div>
  );
}

export type { VoiceSignalCoreProps, VoiceSignalMode };
export { VoiceSignalCore };
