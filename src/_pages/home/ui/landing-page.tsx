import { ArrowRight, AudioLines, Check, Mic2, Music2, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Button } from "@/shared/ui/button";
import { ProductFooter, ProductHeader, type ProductUser } from "@/widgets/product-shell";

import styles from "./landing-hero.module.css";

const waveformBars = [18, 32, 46, 28, 58, 72, 42, 64, 36, 82, 54, 68, 34, 48, 76, 44, 62, 30, 52, 38, 70, 48, 26, 42];
const railClass = "mx-auto w-full max-w-[72rem] px-5 sm:px-7 lg:px-8";

function LandingPage({ admin = false, user = null }: { admin?: boolean; user?: ProductUser | null }) {
  const authenticated = Boolean(user);
  const profileHref = authenticated ? "/profile" : "/login?callbackURL=%2Fprofile";
  const primaryLabel = authenticated ? "목소리 분석 시작하기" : "무료로 시작하기";

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader admin={admin} user={user} />

      <main>
        <section
          className={`${railClass} grid items-center gap-10 py-16 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.82fr)] lg:gap-16 lg:py-24`}
        >
          <div className="max-w-[35rem]">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
              Voice match & AI mixing
            </p>
            <h1 className="mt-4 text-[clamp(2.7rem,5vw,4.25rem)] leading-[0.98] font-semibold tracking-[-0.055em]">
              <span className="block">당신의 목소리에</span>
              <span className="block">맞는 노래를 찾습니다.</span>
            </h1>
            <p className="mt-5 max-w-[31rem] text-[13px] leading-6 text-muted-foreground sm:text-sm sm:leading-7">
              짧은 목소리 샘플로 음역과 안정성을 분석하고, 실제 근거가 있는 추천 키와 노래를 확인하세요. 원하는 곡은 AI
              믹싱 결과로 이어집니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Button nativeButton={false} render={<Link href={profileHref} />} size="sm">
                {primaryLabel} <ArrowRight aria-hidden="true" />
              </Button>
              <Button nativeButton={false} render={<Link href="#how-it-works" />} size="sm" variant="outline">
                이용 방법 보기
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Check aria-hidden="true" className="size-3" /> 5초 이상 녹음 또는 파일 업로드로 시작할 수 있어요.
            </p>
          </div>

          <figure
            aria-label="움직이는 목소리 파형과 분석 시작"
            className={`${styles.visual} relative mx-auto aspect-square w-full max-w-[18rem] sm:max-w-[21rem] lg:max-w-[22rem]`}
          >
            <span aria-hidden="true" className={styles.ambientRing} />
            <span aria-hidden="true" className={styles.rippleRing} />
            <span aria-hidden="true" className={styles.rippleRing} />
            <span aria-hidden="true" className={styles.rippleRing} />
            <div className="absolute inset-[10%] flex flex-col items-center justify-center rounded-full border bg-card/94 px-8">
              <p className="text-[10px] font-medium tracking-[0.1em] text-muted-foreground">10초 목소리 샘플</p>
              <div aria-hidden="true" className="mt-5 flex h-14 w-full items-center justify-center gap-1">
                {waveformBars.map((height, index) => (
                  <span
                    className={`${styles.waveBar} w-[3px] rounded-full bg-data-accent odd:bg-data-accent/50`}
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
                className="mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transform-none"
                href={profileHref}
              >
                <Mic2 aria-hidden="true" className="size-4" />
              </Link>
              <p className="mt-3 text-xs font-medium">눌러서 목소리 분석 시작</p>
            </div>
          </figure>
        </section>

        <section className="border-y" id="how-it-works">
          <div className={`${railClass} py-16 lg:py-20`}>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              From voice to music
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
              분석부터 AI 믹싱까지, 한 흐름으로
            </h2>
            <ol className="mt-9 grid border-t md:grid-cols-3 md:divide-x">
              {[
                {
                  icon: AudioLines,
                  title: "목소리 분석",
                  description: "녹음이나 오디오 파일에서 관찰 음역, 실용 음역과 안정성을 확인합니다.",
                },
                {
                  icon: Music2,
                  title: "노래와 키 추천",
                  description: "분석 결과를 바탕으로 보컬 특성과 비교해 적합한 키와 노래를 추천합니다.",
                },
                {
                  icon: Sparkles,
                  title: "선택형 AI 믹싱",
                  description: "원하는 추천곡만 선택해 AI로 믹싱하고 완료된 결과를 다시 들을 수 있습니다.",
                },
              ].map(({ description, icon: Icon, title }, index) => (
                <li className="border-b py-6 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0" key={title}>
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-full bg-data-accent/10 text-data-accent-foreground">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 max-w-[17rem] text-[13px] leading-6 text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className={`${railClass} grid gap-8 py-16 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-16 lg:py-20`}
          id="why-copy-singer"
        >
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Why Copy Singer
            </p>
            <h2 className="mt-3 max-w-[31rem] text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
              화려한 점수보다, 이해할 수 있는 보컬 근거
            </h2>
          </div>
          <div className="grid border-y sm:grid-cols-3 sm:divide-x">
            {[
              ["실제 측정값", "음역, 안정도 등 실제 분석 데이터만 사용합니다."],
              ["추천 이유", "왜 맞는지와 추천 키를 함께 설명합니다."],
              ["이어지는 기록", "분석과 믹싱 결과를 계정에서 계속 확인합니다."],
            ].map(([title, description]) => (
              <div className="border-b py-5 sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:pr-0" key={title}>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t py-12 sm:py-14">
          <div className={`${railClass}`}>
            <div className="min-h-[12.5rem] rounded-xl border bg-gradient-to-br from-violet-50 via-white to-sky-50 px-7 py-8 sm:px-9 lg:px-11">
              <div className="max-w-[36rem]">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Start your song
                </p>
                <h2 className="mt-2.5 text-2xl font-semibold tracking-[-0.035em]">Every voice has its song.</h2>
                <p className="mt-2.5 text-[13px] leading-6 text-muted-foreground">
                  지금 목소리를 들려주고 첫 보컬 프로필을 만들어보세요. 분석부터 추천과 AI 믹싱까지 한 흐름으로
                  이어집니다.
                </p>
                <Button className="mt-4" nativeButton={false} render={<Link href={profileHref} />} size="sm">
                  {primaryLabel} <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <ProductFooter />
    </div>
  );
}

export { LandingPage };
