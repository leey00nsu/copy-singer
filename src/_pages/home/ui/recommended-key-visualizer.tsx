"use client";

import { useEffect, useRef, useState } from "react";

const barHeights = [78, 46, 38, 24, 18, 14, 16, 34, 52, 68, 86, 92, 88, 70, 56, 40, 28, 18, 24, 20, 34] as const;
const keyDeltas = [-2, 1, -1, 0] as const;
const centerBarIndex = Math.floor(barHeights.length / 2);
type BarState = "base" | "down" | "origin" | "up";

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

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

function getBarState(index: number, value: number): BarState {
  if (index === centerBarIndex) {
    return "origin";
  }

  const deltaEnd = centerBarIndex + value * 2;
  if (value < 0 && index >= deltaEnd && index < centerBarIndex) {
    return "down";
  }
  if (value > 0 && index > centerBarIndex && index <= deltaEnd) {
    return "up";
  }
  return "base";
}

function getBarClass(state: BarState) {
  if (state === "origin") return "bg-white/85 shadow-[0_0_18px_oklch(1_0_0/0.18)]";
  if (state === "down") return "bg-cyan-400/80 shadow-[0_0_14px_oklch(0.78_0.14_220/0.3)]";
  if (state === "up") return "bg-violet-400/80 shadow-[0_0_14px_oklch(0.7_0.18_294/0.32)]";
  return "bg-white/14";
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

  return (
    <div
      aria-label={`추천 키 변경 예시: ${directionLabel}`}
      className="relative z-10 w-full max-w-[18rem] px-4 py-5"
      data-key-delta={delta}
      data-testid="recommended-key-visualizer"
      ref={rootRef}
      role="img"
    >
      <div aria-hidden="true">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[8px] tracking-[0.16em] text-white/35 uppercase">Original key</p>
            <p className="mt-1 text-sm font-medium text-white/75">0</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] tracking-[0.16em] text-white/35 uppercase">Key delta</p>
            <p className={`mt-1 text-4xl font-light tracking-[-0.06em] ${getDirectionTextClass(delta)}`}>
              {formatDelta(delta)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex h-16 items-center justify-between gap-1" data-testid="key-delta-bars">
          {barHeights.map((height, index) => {
            const state = getBarState(index, delta);
            return (
              <span
                className={`w-1.5 rounded-full transition-[background-color,box-shadow,transform] duration-500 motion-reduce:transition-none ${getBarClass(state)} ${state === "origin" ? "scale-y-110" : "scale-y-100"}`}
                data-key-bar={state}
                key={`${height}-${index}`}
                style={{ height: `${height}%`, transitionDelay: `${Math.abs(index - centerBarIndex) * 14}ms` }}
              />
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between text-[8px] tracking-[0.12em] text-white/28 uppercase">
          <span>Lower</span>
          <span className="text-white/55">Original 0</span>
          <span>Higher</span>
        </div>
        <p className={`mt-3 text-center text-[10px] font-medium ${getDirectionTextClass(delta)}`}>{directionLabel}</p>
      </div>
    </div>
  );
}

export { RecommendedKeyVisualizer };
