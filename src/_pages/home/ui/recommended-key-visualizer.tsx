"use client";

import { useEffect, useRef, useState } from "react";

const barHeights = [78, 46, 38, 24, 18, 14, 16, 34, 52, 68, 86, 92, 88, 70, 56, 40, 28, 18, 24, 20, 34] as const;
const keyDeltas = [-2, 1, -1, 0] as const;
const centerBarIndex = Math.floor(barHeights.length / 2);

function getDirectionLabel(value: number) {
  if (value < 0) return `원본에서 ${Math.abs(value)}키 낮춤`;
  if (value > 0) return `원본에서 ${value}키 높임`;
  return "원본 키 유지";
}

function getDirectionTextClass(value: number) {
  if (value < 0) return "text-cyan-300";
  if (value > 0) return "text-violet-300";
  return "text-white/75";
}

function RecommendedKeyVisualizer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [displayedValue, setDisplayedValue] = useState<number>(keyDeltas[0]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    let current = 0;
    let targetIndex = 0;
    let frameId: number | null = null;
    let timerId: number | null = null;
    let visible = false;
    let started = false;
    let atTarget = false;

    const clearFrame = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    };
    const clearTimer = () => {
      if (timerId !== null) window.clearTimeout(timerId);
      timerId = null;
    };
    const canAnimate = () => visible && document.visibilityState === "visible";

    const animateTo = (target: number, onComplete?: () => void) => {
      clearFrame();
      const start = current;
      const startedAt = performance.now();
      atTarget = false;

      const tick = (now: number) => {
        if (!canAnimate()) return;
        const progress = Math.min((now - startedAt) / 850, 1);
        const eased = 1 - (1 - progress) ** 3;
        current = start + (target - start) * eased;
        setDisplayedValue(current);

        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
          return;
        }

        current = target;
        atTarget = true;
        frameId = null;
        setDisplayedValue(target);
        onComplete?.();
      };
      frameId = requestAnimationFrame(tick);
    };

    const scheduleNext = () => {
      clearTimer();
      if (!canAnimate()) return;
      timerId = window.setTimeout(() => {
        targetIndex = (targetIndex + 1) % keyDeltas.length;
        animateTo(keyDeltas[targetIndex] ?? keyDeltas[0], scheduleNext);
      }, 4000);
    };

    const resume = () => {
      if (!canAnimate()) return;
      if (!started) {
        started = true;
        current = 0;
        setDisplayedValue(0);
        animateTo(keyDeltas[0], scheduleNext);
        return;
      }
      if (!atTarget) {
        animateTo(keyDeltas[targetIndex] ?? keyDeltas[0], scheduleNext);
        return;
      }
      scheduleNext();
    };

    const pause = () => {
      clearFrame();
      clearTimer();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) resume();
        else pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") resume();
      else pause();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const delta = Math.round(displayedValue);
  const directionLabel = getDirectionLabel(delta);
  const deltaHeight = Math.abs(displayedValue) * 6;
  const deltaTone = displayedValue < 0 ? "bg-cyan-400" : "bg-violet-400";
  const deltaShadow =
    displayedValue < 0 ? "shadow-[0_0_12px_oklch(0.78_0.14_220/0.38)]" : "shadow-[0_0_12px_oklch(0.7_0.18_294/0.4)]";

  return (
    <div
      aria-label={`추천 키 변경 예시: ${directionLabel}`}
      className="relative z-10 w-full max-w-[18rem] px-4 py-6"
      data-key-delta={delta}
      data-testid="recommended-key-visualizer"
      ref={rootRef}
      role="img"
    >
      <div aria-hidden="true">
        <div className="flex h-24 items-end justify-between gap-1" data-testid="key-delta-bars">
          {barHeights.map((height, index) => {
            const baseHeight = displayedValue < 0 ? Math.max(height - deltaHeight, 5) : height;
            const segmentHeight =
              displayedValue < 0 ? Math.min(deltaHeight, height - baseHeight) : Math.min(deltaHeight, 100 - height);
            const segmentBottom = displayedValue < 0 ? baseHeight : height;
            const isOrigin = index === centerBarIndex;

            return (
              <span
                className="relative h-full min-w-0 flex-1"
                data-key-bar={isOrigin ? "origin" : "base"}
                key={`${height}-${index}`}
              >
                <span
                  className={`absolute inset-x-0 bottom-0 rounded-full ${isOrigin ? "bg-white/82 shadow-[0_0_16px_oklch(1_0_0/0.16)]" : "bg-white/14"}`}
                  data-key-segment="base"
                  style={{ height: `${baseHeight}%` }}
                />
                {segmentHeight > 0.05 ? (
                  <span
                    className={`absolute inset-x-0 rounded-full ${deltaTone} ${deltaShadow}`}
                    data-key-segment={displayedValue < 0 ? "subtracted" : "added"}
                    style={{ bottom: `${segmentBottom}%`, height: `${segmentHeight}%` }}
                  />
                ) : null}
              </span>
            );
          })}
        </div>
        <p className={`mt-5 text-center text-[10px] font-medium ${getDirectionTextClass(delta)}`}>{directionLabel}</p>
      </div>
    </div>
  );
}

export { RecommendedKeyVisualizer };
