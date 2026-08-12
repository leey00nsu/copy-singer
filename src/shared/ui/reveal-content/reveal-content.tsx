"use client";

import type { HTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

import styles from "./reveal-content.module.css";

type RevealContentProps = HTMLAttributes<HTMLDivElement> & {
  delay?: number;
};

// Adapted from the one-shot reveal pattern used by React Bits Fade Content.
function RevealContent({ className, delay = 0, style, ...props }: RevealContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
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
      className={cn(styles.root, visible && styles.visible, className)}
      ref={ref}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      {...props}
    />
  );
}

export { RevealContent };
