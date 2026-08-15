"use client";

import { ArrowRight, CirclePlay } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Fragment, type MouseEvent, type ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import { GradientText } from "@/shared/ui/gradient-text";

import styles from "./landing-hero.module.css";

type LandingHeroProps = {
  primaryLabel: string;
  profileHref: string;
};

const entryEase = [0.22, 1, 0.36, 1] as const;
const wordHidden = { filter: "blur(5px)", opacity: 0, y: "0.32em" } as const;
const wordVisible = { filter: "blur(0px)", opacity: 1, y: 0 } as const;

function MotionWord({ children, index, reduced }: { children: ReactNode; index: number; reduced: boolean }) {
  return (
    <motion.span
      animate={wordVisible}
      className={styles.word}
      data-word-index={index}
      initial={reduced ? false : wordHidden}
      transition={{ delay: 0.09 + index * 0.062, duration: 0.72, ease: entryEase }}
    >
      {children}
    </motion.span>
  );
}

function StaggeredWords({ reduced, startIndex = 0, text }: { reduced: boolean; startIndex?: number; text: string }) {
  const words = text.split(" ");
  return words.map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      <MotionWord index={startIndex + index} reduced={reduced}>
        {word}
      </MotionWord>
      {index < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

function entryMotion(delay: number, reduced: boolean) {
  return {
    animate: { opacity: 1, y: 0 },
    initial: reduced ? false : { opacity: 0, y: 14 },
    transition: { delay, duration: 0.64, ease: entryEase },
  } as const;
}

function LandingHero({ primaryLabel, profileHref }: LandingHeroProps) {
  const reduced = Boolean(useReducedMotion());

  const handleUsageNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (reduced) return;

    const target = document.getElementById("product-story");
    if (!target) return;

    event.preventDefault();
    window.history.pushState(null, "", "#product-story");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="overflow-hidden">
      <div className="mx-auto w-full max-w-[72rem] px-5 pt-20 sm:px-7 sm:pt-24 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-[48rem] text-center">
          <motion.p
            {...entryMotion(0, reduced)}
            className={`${styles.heroEntry} mx-auto inline-flex min-h-7 items-center gap-2 rounded-full border bg-background px-3 text-[10px] text-muted-foreground`}
          >
            <span className="rounded-full bg-data-accent/15 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.08em] text-data-accent-foreground uppercase">
              New
            </span>
            한 소절로 음역과 추천 키를 확인해요
            <CirclePlay aria-hidden="true" className="size-3" />
          </motion.p>
          <h1
            aria-label="나에게 맞는 노래를 찾고 내 목소리로 완성하세요."
            className="mt-7 break-keep text-[clamp(2.65rem,5vw,4.4rem)] leading-[1.02] font-medium tracking-[-0.042em] text-balance"
          >
            <span aria-hidden="true">
              <span className="block">
                <StaggeredWords reduced={reduced} text="나에게 맞는 노래를 찾고" />
              </span>
              <span className="block">
                <MotionWord index={4} reduced={reduced}>
                  <GradientText
                    animationSpeed={1.5}
                    colors={["var(--brand-violet)", "var(--brand-blue)", "var(--brand-pink)"]}
                  >
                    내 목소리로
                  </GradientText>
                </MotionWord>{" "}
                <StaggeredWords reduced={reduced} startIndex={5} text="완성하세요." />
              </span>
            </span>
          </h1>
          <motion.p
            {...entryMotion(0.76, reduced)}
            className={`${styles.heroEntry} mx-auto mt-6 max-w-[38rem] text-sm leading-7 text-muted-foreground sm:text-[15px]`}
          >
            한 소절을 들려주면 음역과 보컬 특성을 분석해, 잘 맞는 노래와 키를 추천하고 AI 믹싱까지 이어드려요.
          </motion.p>
          <motion.div
            {...entryMotion(0.94, reduced)}
            className={`${styles.heroEntry} mt-7 flex flex-wrap items-center justify-center gap-2.5`}
          >
            <Button
              nativeButton={false}
              render={<Link aria-label={`${primaryLabel}: 목소리 분석 시작`} href={profileHref} />}
              size="sm"
            >
              {primaryLabel} <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="#product-story" onClick={handleUsageNavigation} />}
              size="sm"
              variant="outline"
            >
              이용 방법 보기
            </Button>
          </motion.div>
          <motion.p
            {...entryMotion(1.04, reduced)}
            className={`${styles.heroEntry} mt-4 text-[11px] text-muted-foreground`}
          >
            한 소절이면 충분해요 · 10초 정도를 권장해요
          </motion.p>
        </div>
      </div>
    </section>
  );
}

export { LandingHero };
