"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

type CountUpTextProps = {
  ariaLabel?: string;
  className?: string;
  cycleInterval?: number;
  cycleValues?: readonly number[];
  delay?: number;
  duration?: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  to: number;
};

const emptyCycleValues: readonly number[] = [];

function formatValue(value: number, prefix: string, suffix: string) {
  const integer = Math.round(value);
  const number = integer < 0 ? `−${Math.abs(integer)}` : String(integer);
  return `${prefix}${number}${suffix}`;
}

// Adapted from React Bits Count Up: viewport-triggered numeric motion without
// pulling motion/react into the landing bundle.
function CountUpText({
  ariaLabel,
  className,
  cycleInterval = 4200,
  cycleValues = emptyCycleValues,
  delay = 0,
  duration = 1200,
  from = 0,
  prefix = "",
  suffix = "",
  to,
}: CountUpTextProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [displayedValue, setDisplayedValue] = useState(to);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (!("IntersectionObserver" in window)) return;

    const targets = [to, ...cycleValues.filter((value) => value !== to)];
    let current = from;
    let targetIndex = 0;
    let frameId: number | null = null;
    let timerId: number | null = null;
    let delayId: number | null = null;
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
        const progress = Math.min((now - startedAt) / duration, 1);
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

    const scheduleCycle = () => {
      clearTimer();
      if (targets.length < 2 || !canAnimate()) return;
      timerId = window.setTimeout(() => {
        targetIndex = (targetIndex + 1) % targets.length;
        animateTo(targets[targetIndex] ?? to, scheduleCycle);
      }, cycleInterval);
    };

    const resume = () => {
      if (!canAnimate()) return;
      if (!started) {
        started = true;
        current = from;
        setDisplayedValue(from);
        delayId = window.setTimeout(() => animateTo(targets[0] ?? to, scheduleCycle), delay);
        return;
      }
      if (!atTarget) {
        animateTo(targets[targetIndex] ?? to, scheduleCycle);
        return;
      }
      scheduleCycle();
    };

    const pause = () => {
      clearFrame();
      clearTimer();
      if (delayId !== null) window.clearTimeout(delayId);
      delayId = null;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) resume();
        else pause();
      },
      { threshold: 0.2 },
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
  }, [cycleInterval, cycleValues, delay, duration, from, to]);

  const finalValue = ariaLabel ?? formatValue(to, prefix, suffix);

  return (
    <span className={cn("inline-block tabular-nums", className)} data-count-up-target={to} ref={elementRef}>
      <span aria-hidden="true">{formatValue(displayedValue, prefix, suffix)}</span>
      <span className="sr-only">{finalValue}</span>
    </span>
  );
}

export { CountUpText };
