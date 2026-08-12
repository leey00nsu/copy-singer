"use client";

import type { HTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

import styles from "./reveal-content.module.css";

type RevealContentProps = HTMLAttributes<HTMLDivElement> & {
  delay?: number;
  distance?: number;
  duration?: number;
  fromOpacity?: number;
  variant?: "default" | "fade" | "group" | "line" | "section" | "stagger";
};

const variantDefaults = {
  default: { distance: 8, duration: 700, fromOpacity: 0.94 },
  fade: { distance: 0, duration: 800, fromOpacity: 0 },
  group: { distance: 6, duration: 800, fromOpacity: 0 },
  line: { distance: 0, duration: 700, fromOpacity: 1 },
  section: { distance: 16, duration: 700, fromOpacity: 0 },
  stagger: { distance: 0, duration: 650, fromOpacity: 1 },
} as const;

// Adapted from the one-shot reveal pattern used by React Bits Fade Content.
function RevealContent({
  className,
  delay = 0,
  distance,
  duration,
  fromOpacity,
  style,
  variant = "default",
  ...props
}: RevealContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const defaults = variantDefaults[variant];

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      const frameId = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10%", threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(styles.root, styles[variant], visible && styles.visible, className)}
      data-reveal-variant={variant}
      ref={ref}
      style={
        {
          ...style,
          "--reveal-delay": `${delay}ms`,
          "--reveal-distance": `${distance ?? defaults.distance}px`,
          "--reveal-duration": `${duration ?? defaults.duration}ms`,
          "--reveal-opacity": fromOpacity ?? defaults.fromOpacity,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { RevealContent };
