import { ArrowRight, AudioLines, Music2, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";
import { ProductFooter, ProductHeader, type ProductUser } from "@/widgets/product-shell";

import { LandingHero } from "./landing-hero";
import styles from "./landing-hero.module.css";

const railClass = "mx-auto w-full max-w-[72rem] px-5 sm:px-7 lg:px-8";

function LandingPage({ admin = false, user = null }: { admin?: boolean; user?: ProductUser | null }) {
  const authenticated = Boolean(user);
  const profileHref = authenticated ? "/profile" : "/login?callbackURL=%2Fprofile";
  const primaryLabel = authenticated ? "목소리 분석 시작하기" : "무료로 시작하기";

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader admin={admin} user={user} />

      <main>
        <LandingHero primaryLabel={primaryLabel} profileHref={profileHref} />

        <section className="border-y" id="how-it-works">
          <div className={`${styles.sectionReveal} ${railClass} py-16 lg:py-20`}>
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
          className={`${styles.sectionReveal} ${railClass} grid gap-8 py-16 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-16 lg:py-20`}
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
          <div className={`${styles.sectionReveal} ${railClass}`}>
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
