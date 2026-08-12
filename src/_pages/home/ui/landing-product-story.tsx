import { ArrowUpRight, Check, Music2, Sparkles } from "lucide-react";

import { BentoGrid, BentoGridItem } from "@/shared/ui/bento-grid";

import styles from "./landing-hero.module.css";

function AnalysisSurface() {
  return (
    <div className="w-full px-5 py-6 sm:px-7">
      <div className="mx-auto max-w-64 rounded-lg border bg-background p-4 shadow-[0_16px_44px_-32px_oklch(0.2_0.02_285/0.4)]">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
          <span>VOICE PROFILE</span>
          <span className="size-1.5 rounded-full bg-violet-500" />
        </div>
        <dl className="mt-5 space-y-3">
          {["관찰 음역", "실용 음역", "음정 안정성"].map((label, index) => (
            <div
              className="flex items-center justify-between border-b pb-2 text-[10px] last:border-0 last:pb-0"
              key={label}
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">0{index + 1}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function RecommendationSurface() {
  return (
    <div className="grid w-full gap-2 px-5 py-6 sm:px-7">
      {["내 실용 음역과 곡 구간 비교", "부담을 줄이는 추천 키", "보컬 특성에 맞는 추천 이유"].map((label, index) => (
        <div
          className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-[10px] shadow-[0_10px_28px_-26px_oklch(0.2_0.02_285/0.5)]"
          key={label}
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-muted font-medium tabular-nums">
            {index + 1}
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function KeySurface() {
  return (
    <div className="relative flex h-full min-h-44 w-full items-center justify-center bg-neutral-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,oklch(0.7_0.2_294/0.32),transparent_52%)]" />
      <div className="relative text-center">
        <p className="text-[9px] tracking-[0.18em] text-white/45 uppercase">Recommended key</p>
        <p className="mt-2 text-5xl font-light tracking-[-0.06em]">−2</p>
        <p className="mt-2 text-[10px] text-white/55">더 편안한 중심 음역으로</p>
      </div>
    </div>
  );
}

function MixingSurface() {
  return (
    <div className="grid h-full min-h-52 w-full content-center gap-5 bg-[linear-gradient(120deg,oklch(0.97_0.02_305),white_45%,oklch(0.96_0.025_225))] px-6 py-8 sm:grid-cols-[.8fr_1.2fr] sm:px-8">
      <div className="flex aspect-square max-h-36 items-center justify-center justify-self-center rounded-xl bg-neutral-950 text-white shadow-2xl">
        <Music2 aria-hidden="true" className="size-7 text-violet-300" />
      </div>
      <div className="self-center">
        <p className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Selected song</p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">선택한 추천곡만 AI 믹싱</p>
        <ol aria-label="AI 믹싱 이용 흐름" className="mt-4 grid gap-2 text-[10px]">
          {["추천곡 선택", "AI 믹싱 요청", "결과 듣기와 보관"].map((label) => (
            <li className="flex items-center gap-2" key={label}>
              <Check aria-hidden="true" className="size-3 text-violet-600" /> {label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function OrbPoster() {
  return (
    <div className="relative grid h-full min-h-52 w-full place-items-center overflow-hidden bg-[#fafafa]">
      <span aria-hidden="true" className={styles.orbPoster} />
      <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>VOICE SIGNAL</span>
        <Sparkles aria-hidden="true" className="size-3" />
      </div>
    </div>
  );
}

function LandingProductStory() {
  return (
    <section
      className="mx-auto w-full max-w-[72rem] px-5 pt-16 pb-24 sm:px-7 sm:pt-20 lg:px-8 lg:pb-36"
      id="how-it-works"
    >
      <BentoGrid aria-label="Copy Singer 제품 흐름 미리보기" className={styles.productBento}>
        <BentoGridItem
          className="md:col-span-2"
          description="목소리의 범위와 안정성을 같은 기준으로"
          eyebrow="01 · Analyze"
          title="목소리 분석"
        >
          <AnalysisSurface />
        </BentoGridItem>
        <BentoGridItem
          className="md:col-span-2"
          description="부르기 좋은 노래와 이유를 함께"
          eyebrow="02 · Match"
          title="노래와 키 추천"
        >
          <RecommendationSurface />
        </BentoGridItem>
        <BentoGridItem
          className="md:col-span-2"
          description="과하지 않은 이동 키 제안"
          eyebrow="Key fit"
          title="추천 키"
        >
          <KeySurface />
        </BentoGridItem>
        <BentoGridItem
          className="md:col-span-4"
          description="선택 후에만 작업을 시작합니다"
          eyebrow="03 · Create"
          title="선택형 AI 믹싱"
        >
          <MixingSurface />
        </BentoGridItem>
        <BentoGridItem
          className="md:col-span-2"
          description="한 소절에서 시작되는 보컬 신호"
          eyebrow="Copy Singer"
          title="Your voice, made visible"
        >
          <OrbPoster />
        </BentoGridItem>
      </BentoGrid>
      <p className="mt-4 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        분석에서 믹싱까지, 한 흐름으로 <ArrowUpRight aria-hidden="true" className="size-3" />
      </p>
    </section>
  );
}

export { LandingProductStory };
