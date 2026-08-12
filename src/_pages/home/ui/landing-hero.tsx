import { ArrowRight, Check, Mic2 } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Button } from "@/shared/ui/button";

import styles from "./landing-hero.module.css";

const waveformBars = [18, 32, 46, 28, 58, 72, 42, 64, 36, 82, 54, 68, 34, 48, 76, 44, 62, 30, 52, 38, 70, 48, 26, 42];

type LandingHeroProps = {
  primaryLabel: string;
  profileHref: string;
};

function LandingHero({ primaryLabel, profileHref }: LandingHeroProps) {
  return (
    <section className="overflow-hidden border-b">
      <div className="mx-auto w-full max-w-[72rem] px-5 pt-16 sm:px-7 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-[50rem] text-center">
          <p className="mx-auto inline-flex min-h-7 items-center rounded-full border bg-background px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Voice match · Song recommendation · AI mixing
          </p>
          <h1 className="mt-6 text-[clamp(2.75rem,7vw,5.7rem)] leading-[0.94] font-semibold tracking-[-0.065em] text-balance">
            당신의 목소리에 맞는
            <span className="block">노래를 찾습니다.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[39rem] text-sm leading-7 text-muted-foreground sm:text-[15px]">
            짧은 목소리 샘플에서 음역과 안정성을 분석하고, 이유가 있는 추천 키와 노래를 확인하세요. 원하는 곡은 선택형
            AI 믹싱으로 이어집니다.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Button nativeButton={false} render={<Link href={profileHref} />} size="sm">
              {primaryLabel} <ArrowRight aria-hidden="true" />
            </Button>
            <Button nativeButton={false} render={<Link href="#how-it-works" />} size="sm" variant="outline">
              작동 방식 보기
            </Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Check aria-hidden="true" className="size-3" /> 5초 이상 녹음 또는 파일 업로드로 시작할 수 있어요.
          </p>
        </div>

        <figure
          aria-label="움직이는 목소리 파형과 분석 시작"
          className={`${styles.visual} relative mx-auto mt-14 max-w-[61rem] sm:mt-16`}
        >
          <span aria-hidden="true" className={styles.ambientRing} />
          <span aria-hidden="true" className={styles.rippleRing} />
          <span aria-hidden="true" className={styles.rippleRing} />
          <span aria-hidden="true" className={styles.rippleRing} />

          <div className="relative overflow-hidden rounded-t-2xl border border-b-0 bg-card">
            <div className="flex min-h-11 items-center justify-between border-b px-4 sm:px-5">
              <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-data-accent" />
                Voice analysis preview
              </div>
              <span className="text-[10px] text-muted-foreground">Copy Singer</span>
            </div>

            <div className="grid min-h-[19rem] items-stretch md:grid-cols-[minmax(0,1.45fr)_minmax(15rem,.55fr)]">
              <div className="flex min-h-[19rem] flex-col items-center justify-center px-6 py-10 sm:px-10">
                <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Your voice, made visible
                </p>
                <div
                  aria-hidden="true"
                  className="mt-6 flex h-24 w-full max-w-[32rem] items-center justify-center gap-1 sm:gap-1.5"
                >
                  {waveformBars.map((height, index) => (
                    <span
                      className={`${styles.waveBar} w-[3px] rounded-full bg-data-accent odd:bg-data-accent/45 sm:w-1`}
                      key={`${height}-${index}`}
                      style={
                        {
                          "--bar-delay": `${-(index % 8) * 110}ms`,
                          "--bar-duration": `${940 + (index % 5) * 170}ms`,
                          "--bar-height": `${height}%`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
                <Link
                  aria-label={`${primaryLabel}: 목소리 분석 시작`}
                  className="mt-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transform-none"
                  href={profileHref}
                >
                  <Mic2 aria-hidden="true" className="size-4" />
                </Link>
                <p className="mt-3 text-xs font-medium">목소리 분석 시작</p>
              </div>

              <div className="grid content-center gap-6 border-t bg-muted/30 px-6 py-8 md:border-t-0 md:border-l md:px-7">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    분석에서 확인하는 것
                  </p>
                  <p className="mt-2 text-sm leading-6">목소리의 범위와 안정성을 같은 기준으로 정리합니다.</p>
                </div>
                <dl className="grid gap-3 text-xs">
                  {["관찰 음역", "실용 음역", "음정 안정성"].map((label, index) => (
                    <div className="flex items-center justify-between border-b pb-3" key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="flex items-center gap-2 font-medium">
                        <span aria-hidden="true" className="h-px w-5 bg-data-accent/70" />0{index + 1}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

export { LandingHero };
