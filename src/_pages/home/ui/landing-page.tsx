import { ArrowRight, AudioLines, Check, Mic2, Music2, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Button } from "@/shared/ui/button";
import { ProductBrand } from "@/widgets/product-shell";

import styles from "./landing-hero.module.css";

const waveformBars = [18, 32, 46, 28, 58, 72, 42, 64, 36, 82, 54, 68, 34, 48, 76, 44, 62, 30, 52, 38, 70, 48, 26, 42];

function LandingPage({ authenticated = false }: { authenticated?: boolean }) {
  const primaryHref = authenticated ? "/profile" : "/login?callbackURL=%2Fprofile";
  const primaryLabel = authenticated ? "목소리 분석 계속하기" : "무료로 시작하기";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8 lg:px-12">
          <ProductBrand />
          <nav aria-label="소개 메뉴" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#how-it-works">
              이용 방법
            </a>
            <a className="transition-colors hover:text-foreground" href="#why-copy-singer">
              분석 기준
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {!authenticated ? (
              <Button nativeButton={false} render={<Link href="/login?callbackURL=%2Fprofile" />} variant="ghost">
                로그인
              </Button>
            ) : null}
            <Button nativeButton={false} render={<Link href={primaryHref} />}>
              {primaryLabel}
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl items-center gap-6 px-5 py-8 sm:gap-10 sm:py-14 md:px-8 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.82fr)] lg:gap-12 lg:px-12 lg:py-16">
          <div className="max-w-[42rem]">
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Voice match & AI mixing
            </p>
            <h1 className="mt-4 text-[clamp(2.55rem,5.3vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.052em] sm:mt-5">
              <span className="block">당신의 목소리에</span>
              <span className="block">맞는 노래를 찾습니다.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 md:text-lg md:leading-8">
              짧은 목소리 샘플로 음역과 안정성을 분석하고, 실제 근거가 있는 추천 키와 노래를 확인하세요. 원하는 곡은 AI
              믹싱 결과로 이어집니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <Button nativeButton={false} render={<Link href={primaryHref} />} size="lg">
                {primaryLabel} <ArrowRight aria-hidden="true" />
              </Button>
              <Button nativeButton={false} render={<Link href="#how-it-works" />} size="lg" variant="outline">
                이용 방법 보기
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Check aria-hidden="true" className="size-3.5" /> 5초 이상 녹음 또는 파일 업로드로 시작할 수 있어요.
            </p>
          </div>

          <figure
            aria-label="움직이는 목소리 파형과 분석 시작"
            className={`${styles.visual} relative mx-auto aspect-square w-full max-w-[17rem] sm:max-w-sm lg:max-w-[28rem]`}
          >
            <span aria-hidden="true" className={styles.ambientRing} />
            <span aria-hidden="true" className={styles.rippleRing} />
            <span aria-hidden="true" className={styles.rippleRing} />
            <span aria-hidden="true" className={styles.rippleRing} />
            <div className="absolute inset-[9%] flex flex-col items-center justify-center rounded-full border bg-card/92 px-7 sm:px-10">
              <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs">
                10초 목소리 샘플
              </p>
              <div
                aria-hidden="true"
                className="mt-4 flex h-14 w-full items-center justify-center gap-1 sm:mt-7 sm:h-20 sm:gap-1.5"
              >
                {waveformBars.map((height, index) => (
                  <span
                    className={`${styles.waveBar} w-0.5 rounded-full bg-data-accent odd:bg-data-accent/45 sm:w-1`}
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
                className="mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transform-none sm:mt-7 sm:size-14"
                href={primaryHref}
              >
                <Mic2 aria-hidden="true" className="size-5" />
              </Link>
              <p className="mt-3 text-xs font-medium sm:mt-4 sm:text-sm">눌러서 목소리 분석 시작</p>
            </div>
          </figure>
        </section>

        <section className="border-y" id="how-it-works">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 md:px-8 lg:px-12 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                From voice to music
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                분석부터 AI 믹싱까지, 한 흐름으로
              </h2>
            </div>
            <ol className="mt-14 grid border-t md:grid-cols-3 md:divide-x">
              {[
                {
                  icon: AudioLines,
                  title: "목소리 분석",
                  description: "녹음이나 오디오 파일에서 관찰 음역, 실용 음역과 안정성을 확인합니다.",
                },
                {
                  icon: Music2,
                  title: "노래와 키 추천",
                  description: "곡의 저장된 보컬 특성과 비교해 적합도, 키 이동과 추천 근거를 보여줍니다.",
                },
                {
                  icon: Sparkles,
                  title: "선택형 AI 믹싱",
                  description: "원하는 추천곡만 믹싱하고, 작업이 끝나면 결과를 다시 듣고 저장할 수 있습니다.",
                },
              ].map(({ description, icon: Icon, title }, index) => (
                <li className="border-b py-8 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0" key={title}>
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg border bg-card">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="mt-7 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-2 lg:px-12 lg:py-28"
          id="why-copy-singer"
        >
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Why Copy Singer</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
              화려한 점수보다, 이해할 수 있는 보컬 근거
            </h2>
          </div>
          <div className="divide-y border-y">
            {[
              ["실제 측정값", "관찰 음역과 안정성처럼 분석 데이터로 확인할 수 있는 값만 표시합니다."],
              ["추천 이유", "원키 적합도, 추천 키와 음역 차이를 함께 보여 한 곡씩 판단할 수 있습니다."],
              ["이어지는 기록", "보컬 프로필과 AI 믹싱 결과는 로그인한 계정에서 다시 확인할 수 있습니다."],
            ].map(([title, description]) => (
              <div className="grid gap-2 py-6 sm:grid-cols-[9rem_1fr]" key={title}>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/45">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 md:flex-row md:items-center md:px-8 lg:px-12">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Every voice has its song.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                지금 목소리를 들려주고 첫 보컬 프로필을 만들어보세요.
              </p>
            </div>
            <Button nativeButton={false} render={<Link href={primaryHref} />} size="lg">
              {primaryLabel} <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-8 lg:px-12">
          <ProductBrand />
          <p>© 2026 Copy Singer. 목소리 분석과 AI 믹싱 경험.</p>
        </div>
      </footer>
    </div>
  );
}

export { LandingPage };
