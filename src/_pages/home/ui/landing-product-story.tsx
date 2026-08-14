import { Check } from "lucide-react";
import Image from "next/image";

import { VocalRangeChart } from "@/entities/vocal-profile";
import { BentoGrid, BentoGridItem } from "@/shared/ui/bento-grid";
import { RevealContent } from "@/shared/ui/reveal-content";
import { VoiceOrb } from "@/shared/ui/voice-orb";

const sampleVocalProfile = {
  maxMidi: 82,
  medianMidi: 70,
  minMidi: 52,
  tessituraHighMidi: 73,
  tessituraLowMidi: 67,
} as const;

function AnalysisSurface() {
  return (
    <div className="w-full px-5 py-6 sm:px-7">
      <div className="mx-auto max-w-64 rounded-lg border bg-background p-4 shadow-[0_16px_44px_-32px_oklch(0.2_0.02_285/0.4)]">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
          <span>VOICE PROFILE</span>
          <span className="size-1.5 rounded-full bg-data-accent" />
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
    <div className="relative flex h-full min-h-44 w-full items-center overflow-hidden bg-background p-3">
      <VocalRangeChart className="h-36 w-full aspect-auto" profile={sampleVocalProfile} />
    </div>
  );
}

const albumCovers = [
  {
    className:
      "z-10 -ml-8 mt-2 -rotate-[8deg] group-hover/bento:-ml-12 group-hover/bento:mt-1 group-hover/bento:-rotate-[10deg]",
    eager: true,
    src: "/images/landing/album-covers/stars-mountain.jpg",
  },
  {
    className:
      "z-20 ml-8 mt-3 rotate-[8deg] group-hover/bento:ml-12 group-hover/bento:mt-2 group-hover/bento:rotate-[10deg]",
    eager: false,
    src: "/images/landing/album-covers/sunset-sea.jpg",
  },
  {
    className:
      "z-30 -mt-5 -ml-3 -rotate-[3deg] group-hover/bento:-mt-7 group-hover/bento:-ml-5 group-hover/bento:-rotate-[4deg]",
    eager: false,
    src: "/images/landing/album-covers/neon-city.jpg",
  },
  {
    className:
      "z-40 mt-1 ml-1 rotate-[1deg] group-hover/bento:mt-2 group-hover/bento:ml-2 group-hover/bento:rotate-[2deg]",
    eager: false,
    src: "/images/landing/album-covers/colorful-abstract.jpg",
  },
] as const;

function AlbumCoverStack() {
  return (
    <div aria-hidden="true" className="relative isolate h-44 w-52 shrink-0" data-testid="album-cover-stack">
      <div className="absolute inset-x-8 bottom-2 h-12 rounded-full bg-data-accent/18 blur-2xl" />
      {albumCovers.map(({ className, eager, src }) => (
        <div
          className={`absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-white/65 bg-neutral-900 shadow-[0_18px_36px_-18px_oklch(0.18_0.04_285/0.7)] transition-[margin,rotate] duration-500 ease-out motion-reduce:transition-none ${className}`}
          key={src}
        >
          <Image alt="" className="object-cover" fill loading={eager ? "eager" : "lazy"} sizes="7rem" src={src} />
        </div>
      ))}
    </div>
  );
}

function MixingSurface() {
  return (
    <div className="grid h-full min-h-52 w-full content-center gap-5 bg-[linear-gradient(120deg,oklch(0.97_0.02_305),white_45%,oklch(0.96_0.025_225))] px-6 py-8 sm:grid-cols-[.8fr_1.2fr] sm:px-8">
      <AlbumCoverStack />
      <div className="self-center">
        <p className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Selected song</p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">선택한 추천곡만 AI 믹싱</p>
        <ol aria-label="AI 믹싱 이용 흐름" className="mt-4 grid gap-2 text-[10px]">
          {["추천곡 선택", "AI 믹싱 요청", "결과 듣기와 보관"].map((label) => (
            <li className="flex items-center gap-2" key={label}>
              <Check aria-hidden="true" className="size-3 text-data-accent-foreground" /> {label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function OrbPoster() {
  return (
    <div className="relative grid h-full min-h-52 w-full place-items-center overflow-hidden bg-background">
      <VoiceOrb className="absolute inset-0" hoverIntensity={0} hue={294} rotateOnHover={false} />
    </div>
  );
}

function LandingProductStory() {
  return (
    <section
      className="mx-auto w-full max-w-[72rem] px-5 pt-16 pb-24 sm:px-7 sm:pt-20 lg:px-8 lg:pb-36"
      id="how-it-works"
    >
      <RevealContent distance={0} duration={1400} fromOpacity={0}>
        <BentoGrid aria-label="Copysinger 제품 흐름 미리보기">
          <BentoGridItem className="md:col-span-2" eyebrow="01 · ANALYZE" title="목소리 분석">
            <AnalysisSurface />
          </BentoGridItem>
          <BentoGridItem className="md:col-span-2" eyebrow="02 · MATCH" title="노래 · 키 추천">
            <RecommendationSurface />
          </BentoGridItem>
          <BentoGridItem className="md:col-span-2" eyebrow="Vocal range" title="보컬 프로필">
            <KeySurface />
          </BentoGridItem>
          <BentoGridItem className="md:col-span-4" eyebrow="03 · CREATE" title="AI 믹싱">
            <MixingSurface />
          </BentoGridItem>
          <BentoGridItem className="md:col-span-2" eyebrow="Copysinger" title="내 목소리를 한눈에.">
            <OrbPoster />
          </BentoGridItem>
        </BentoGrid>
      </RevealContent>
    </section>
  );
}

export { LandingProductStory };
