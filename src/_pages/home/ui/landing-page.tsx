import { ArrowRight, Library, Mic2, Music2, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { RevealContent } from "@/shared/ui/reveal-content";
import { ProductFooter, ProductHeader, type ProductUser } from "@/widgets/product-shell";

import { LandingHero } from "./landing-hero";
import { LandingProductStory } from "./landing-product-story";

const railClass = "mx-auto w-full max-w-[72rem] px-5 sm:px-7 lg:px-8";

function revealDelay(index: number): CSSProperties {
  return { "--reveal-item-delay": `${index * 70}ms` } as CSSProperties;
}

const editorialSteps = [
  {
    description: "녹음하거나 파일을 올리면 관찰 음역, 실용 음역과 음정 안정성을 확인해요.",
    eyebrow: "01 · Voice",
    icon: Mic2,
    title: "한 소절을 들려주세요.",
  },
  {
    description: "보컬 프로필과 곡의 음역을 비교해 추천곡과 키, 이유를 보여줘요.",
    eyebrow: "02 · Match",
    icon: Music2,
    title: "맞는 노래와 키를 찾아요.",
  },
  {
    description: "추천곡을 선택해 AI 믹싱을 만들고, 완료된 결과는 라이브러리에 저장해요.",
    eyebrow: "03 · Create",
    icon: Sparkles,
    title: "추천곡을 AI 믹싱해요.",
  },
] as const;

const voiceNotes = [
  {
    description: "마이크를 너무 가깝게 두지 말고 평소처럼 편하게 불러주세요.",
    image: "/images/landing/voice-notes/recording-aurora.webp",
    label: "Recording",
    title: "편하게 녹음하기",
  },
  {
    description: "최고음보다 반복해서 편하게 낼 수 있는 실용 음역을 기준으로 봐요.",
    image: "/images/landing/voice-notes/vocal-profile-aurora.webp",
    label: "Vocal profile",
    title: "실용 음역 읽기",
  },
  {
    description: "추천 키는 내 음역에서 고음·저음 부담을 줄이는 방향으로 계산해요.",
    image: "/images/landing/voice-notes/song-match-aurora.webp",
    label: "Song match",
    title: "추천 키 이해하기",
  },
  {
    description: "완료된 AI 믹싱은 라이브러리에서 다시 듣고 관리할 수 있어요.",
    image: "/images/landing/voice-notes/ai-mixing-aurora.webp",
    label: "AI mixing",
    title: "결과 보관하기",
  },
] as const;

const metrics = [
  { label: "분석 가능한 최소 입력", suffix: "초+", value: 5 },
  { label: "한 번에 담는 최대 입력", suffix: "초", value: 60 },
  { label: "분석부터 믹싱까지", suffix: "단계", value: 3 },
] as const;

function LandingPage({ admin = false, user = null }: { admin?: boolean; user?: ProductUser | null }) {
  const authenticated = Boolean(user);
  const profileHref = authenticated ? "/profile" : "/login?callbackURL=%2Fprofile";
  const libraryHref = authenticated ? "/library" : "/login?callbackURL=%2Flibrary";
  const primaryLabel = authenticated ? "목소리 분석 시작하기" : "무료로 시작하기";

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader admin={admin} user={user} />

      <main>
        <LandingHero primaryLabel={primaryLabel} profileHref={profileHref} />
        <LandingProductStory />

        <section className={`${railClass} py-24 sm:py-32 lg:py-44`} id="product-story">
          <div className="grid gap-14 lg:grid-cols-[minmax(15rem,.72fr)_minmax(0,1.28fr)] lg:items-start lg:gap-24">
            <RevealContent className="lg:sticky lg:top-32" variant="section">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">One voice</p>
              <h2 className="mt-4 max-w-[28rem] text-4xl leading-[1.03] font-medium tracking-[-0.045em] sm:text-5xl">
                한 소절.
                <span className="block text-muted-foreground">세 단계의 흐름.</span>
              </h2>
              <p className="mt-6 max-w-[25rem] text-[13px] leading-6 text-muted-foreground">
                목소리 분석, 노래 추천, AI 믹싱 순서로 필요한 결과를 확인해요.
              </p>
            </RevealContent>

            <RevealContent
              className="overflow-hidden rounded-xl border bg-card shadow-[0_32px_90px_-72px_oklch(0.15_0.02_285/0.45)]"
              delay={100}
              variant="stagger"
            >
              <div
                className="flex h-11 items-center justify-between border-b px-4 text-[9px] text-muted-foreground sm:px-5"
                data-reveal-item
                style={revealDelay(0)}
              >
                <span>COPY SINGER / VOICE TO SONG</span>
                <span className="flex gap-1">
                  <i className="size-1.5 rounded-full bg-red-300" />
                  <i className="size-1.5 rounded-full bg-amber-300" />
                  <i className="size-1.5 rounded-full bg-emerald-300" />
                </span>
              </div>
              <ol>
                {editorialSteps.map(({ description, eyebrow, icon: Icon, title }, index) => (
                  <li
                    className="grid gap-5 border-b p-6 last:border-0 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:p-8"
                    data-reveal-item
                    key={title}
                    style={revealDelay(index + 1)}
                  >
                    <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div>
                      <p className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        {eyebrow}
                      </p>
                      <h3 className="mt-1.5 text-base font-semibold tracking-[-0.025em]">{title}</h3>
                      <p className="mt-2 max-w-[31rem] text-xs leading-5 text-muted-foreground">{description}</p>
                    </div>
                    <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">0{index + 1}</span>
                  </li>
                ))}
              </ol>
            </RevealContent>
          </div>
        </section>

        <section>
          <RevealContent className="relative" variant="line">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 border-t" data-reveal-line />
            <div className={`${railClass} grid sm:grid-cols-3 sm:divide-x`}>
              {metrics.map(({ label, suffix, value }, index) => (
                <div
                  className="border-b py-16 text-center last:border-b-0 sm:border-b-0 sm:px-7 sm:py-20"
                  data-reveal-item
                  key={label}
                  style={revealDelay(index)}
                >
                  <p className="text-5xl font-light tracking-[-0.055em] sm:text-6xl">{`${value}${suffix}`}</p>
                  <p className="mt-4 text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 border-b" data-reveal-line />
          </RevealContent>
        </section>

        <section className={`${railClass} py-24 sm:py-32 lg:py-40`}>
          <RevealContent className="flex items-end justify-between gap-5" variant="section">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Voice notes</p>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.035em]">녹음과 추천을 볼 때 알아둘 점</h2>
            </div>
            <span className="hidden text-[10px] text-muted-foreground sm:block">Copysinger guide</span>
          </RevealContent>
          <RevealContent className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" delay={100} variant="stagger">
            {voiceNotes.map(({ description, image, label, title }, index) => (
              <article data-reveal-item key={title} style={revealDelay(index)}>
                <div className="relative aspect-[1.65] overflow-hidden rounded-lg bg-muted" data-reveal-media>
                  <Image
                    alt=""
                    className="object-cover transition-transform duration-700 hover:scale-[1.015] motion-reduce:transition-none"
                    fill
                    sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) 50vw, 18rem"
                    src={image}
                  />
                </div>
                <p className="mt-3 text-[9px] text-muted-foreground uppercase">{label}</p>
                <h3 className="mt-1 text-xs font-semibold">{title}</h3>
                <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{description}</p>
              </article>
            ))}
          </RevealContent>
        </section>

        <section className={`${railClass} border-t py-20 sm:py-24`}>
          <RevealContent variant="fade">
            <h2 className="text-center text-2xl font-medium tracking-[-0.035em]">어떻게 시작할까요?</h2>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <article className="flex min-h-64 flex-col rounded-xl bg-muted/55 p-7 sm:p-9">
                <Mic2 aria-hidden="true" className="size-5" />
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.025em]">첫 목소리 분석 시작</h3>
                <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
                  한 소절을 녹음하거나 파일을 올려 보컬 프로필을 만들어요.
                </p>
                <Link
                  className="mt-auto flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={profileHref}
                >
                  {primaryLabel} <ArrowRight aria-hidden="true" className="ml-2 size-3.5" />
                </Link>
              </article>
              <article className="flex min-h-64 flex-col rounded-xl border bg-card p-7 sm:p-9">
                <Library aria-hidden="true" className="size-5" />
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.025em]">기존 결과 이어보기</h3>
                <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
                  저장된 보컬 프로필과 AI 믹싱 결과는 라이브러리에서 다시 볼 수 있어요.
                </p>
                <Link
                  className="mt-auto flex min-h-11 items-center justify-center rounded-md border px-4 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={libraryHref}
                >
                  라이브러리 보기 <ArrowRight aria-hidden="true" className="ml-2 size-3.5" />
                </Link>
              </article>
            </div>
          </RevealContent>
        </section>
      </main>

      <ProductFooter />
    </div>
  );
}

export { LandingPage };
