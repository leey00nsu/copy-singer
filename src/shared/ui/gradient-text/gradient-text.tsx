"use client";

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

type GradientTextProps = {
  animationSpeed?: number;
  children: ReactNode;
  className?: string;
  colors?: string[];
  direction?: "diagonal" | "horizontal" | "vertical";
  pauseOnHover?: boolean;
  showBorder?: boolean;
  yoyo?: boolean;
};

// Source adapted from React Bits GradientText (MIT):
// https://github.com/DavidHDev/react-bits/blob/main/src/ts-tailwind/TextAnimations/GradientText/GradientText.tsx
function GradientText({
  animationSpeed = 8,
  children,
  className,
  colors = ["#5227ff", "#ff9ffc", "#b497cf"],
  direction = "horizontal",
  pauseOnHover = false,
  showBorder = false,
  yoyo = true,
}: GradientTextProps) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const animationDuration = Math.max(animationSpeed, 0.01) * 1000;

  useAnimationFrame((time) => {
    if (shouldReduceMotion || isPaused) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    if (yoyo) {
      const fullCycle = animationDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;
      progress.set(
        cycleTime < animationDuration
          ? (cycleTime / animationDuration) * 100
          : 100 - ((cycleTime - animationDuration) / animationDuration) * 100,
      );
      return;
    }

    progress.set((elapsedRef.current / animationDuration) * 100);
  });

  useEffect(() => {
    elapsedRef.current = 0;
    lastTimeRef.current = null;
    progress.set(shouldReduceMotion ? 50 : 0);
  }, [animationSpeed, progress, shouldReduceMotion, yoyo]);

  const backgroundPosition = useTransform(progress, (position) => {
    if (direction === "vertical") return `50% ${position}%`;
    return `${position}% 50%`;
  });
  const gradientAngle =
    direction === "horizontal" ? "to right" : direction === "vertical" ? "to bottom" : "to bottom right";
  const gradientStyle = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${[...colors, colors[0]].join(", ")})`,
    backgroundRepeat: "repeat",
    backgroundSize: direction === "horizontal" ? "300% 100%" : direction === "vertical" ? "100% 300%" : "300% 300%",
  } as const;
  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);
  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  return (
    <motion.span
      className={cn("relative inline-block max-w-fit overflow-hidden", showBorder && "rounded-[1.25rem] p-px")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showBorder ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[1.25rem]"
          style={{ ...gradientStyle, backgroundPosition }}
        >
          <span className="absolute inset-px rounded-[calc(1.25rem-1px)] bg-background" />
        </motion.span>
      ) : null}
      <motion.span
        className={cn("relative z-[1] inline-block bg-clip-text text-transparent", className)}
        data-animation-speed={animationSpeed}
        data-gradient-text
        data-yoyo={yoyo}
        style={{ ...gradientStyle, backgroundPosition, WebkitBackgroundClip: "text" }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

export type { GradientTextProps };
export { GradientText };
