import { ArrowRight, CirclePlay } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, Fragment } from "react";

import { Button } from "@/shared/ui/button";

import styles from "./landing-hero.module.css";

type LandingHeroProps = {
  primaryLabel: string;
  profileHref: string;
};

function StaggeredWords({ startIndex = 0, text }: { startIndex?: number; text: string }) {
  const words = text.split(" ");
  return words.map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      <span className={styles.word} style={{ "--word-index": startIndex + index } as CSSProperties}>
        {word}
      </span>
      {index < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

function LandingHero({ primaryLabel, profileHref }: LandingHeroProps) {
  return (
    <section className="overflow-hidden">
      <div className="mx-auto w-full max-w-[72rem] px-5 pt-20 sm:px-7 sm:pt-24 lg:px-8 lg:pt-28">
        <div className={`${styles.heroCopy} mx-auto max-w-[48rem] text-center`}>
          <p
            className={`${styles.heroMeta} mx-auto inline-flex min-h-7 items-center gap-2 rounded-full border bg-background px-3 text-[10px] text-muted-foreground`}
          >
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.08em] text-violet-700 uppercase">
              New
            </span>
            목소리 하나로 시작하는 나만의 선곡
            <CirclePlay aria-hidden="true" className="size-3" />
          </p>
          <h1
            aria-label="내 목소리에 맞는 노래를 찾고, 가장 나답게 완성하세요."
            className="mt-7 text-[clamp(2.65rem,5vw,4.4rem)] leading-[1.02] font-medium tracking-[-0.042em] text-balance"
          >
            <span aria-hidden="true">
              <span className={styles.wordLine}>
                <StaggeredWords text="내 목소리에 맞는 노래를 찾고," />
              </span>
              <span className={`${styles.wordLine} block`}>
                <StaggeredWords startIndex={5} text="가장 나답게 완성하세요." />
              </span>
            </span>
          </h1>
          <p
            className={`${styles.heroMeta} ${styles.heroDescription} mx-auto mt-6 max-w-[38rem] text-sm leading-7 text-muted-foreground sm:text-[15px]`}
          >
            한 소절의 목소리에서 음역과 안정성을 읽고, 부르기 좋은 노래와 키를 추천합니다. 선택한 곡은 AI 믹싱으로
            자연스럽게 이어집니다.
          </p>
          <div
            className={`${styles.heroMeta} ${styles.heroActions} mt-7 flex flex-wrap items-center justify-center gap-2.5`}
          >
            <Button
              nativeButton={false}
              render={<Link aria-label={`${primaryLabel}: 목소리 분석 시작`} href={profileHref} />}
              size="sm"
            >
              {primaryLabel} <ArrowRight aria-hidden="true" />
            </Button>
            <Button nativeButton={false} render={<Link href="#how-it-works" />} size="sm" variant="outline">
              제품 둘러보기
            </Button>
          </div>
          <p className={`${styles.heroMeta} ${styles.heroHint} mt-4 text-[11px] text-muted-foreground`}>
            5초 이상 녹음하거나 파일을 올리면 바로 시작할 수 있어요.
          </p>
        </div>
      </div>
    </section>
  );
}

export { LandingHero };
