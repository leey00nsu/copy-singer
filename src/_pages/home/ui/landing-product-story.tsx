import { AudioLines, Music2, Sparkles } from "lucide-react";

import styles from "./landing-hero.module.css";

const storySteps = [
  {
    description: "녹음이나 오디오 파일에서 관찰 음역, 실용 음역과 음정 안정성을 같은 기준으로 정리합니다.",
    icon: AudioLines,
    title: "목소리 분석",
  },
  {
    description: "보컬 특성과 곡의 요구 범위를 비교해 맞는 노래, 추천 키와 그 이유를 함께 보여줍니다.",
    icon: Music2,
    title: "노래와 키 추천",
  },
  {
    description: "추천을 확인한 뒤 원하는 곡만 선택해 AI 믹싱하고, 완료된 결과를 라이브러리에 보관합니다.",
    icon: Sparkles,
    title: "선택형 AI 믹싱",
  },
] as const;

function VoiceAnalysisPreview() {
  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
      <div className="flex min-h-40 items-center justify-center rounded-lg border bg-background px-5">
        <div aria-hidden="true" className="flex h-20 w-full items-center justify-center gap-1">
          {[24, 42, 68, 36, 78, 52, 88, 44, 72, 32, 62, 46, 82, 38, 58, 28].map((height, index) => (
            <span
              className={`${styles.storyWaveBar} w-1 rounded-full bg-data-accent odd:bg-data-accent/45`}
              key={`${height}-${index}`}
              style={{ height: `${height}%`, animationDelay: `${-(index % 6) * 130}ms` }}
            />
          ))}
        </div>
      </div>
      <dl className="grid gap-3 text-xs">
        {[
          ["Range", "관찰·실용 음역"],
          ["Center", "목소리 중앙"],
          ["Stability", "음정 안정성"],
        ].map(([term, description]) => (
          <div className="border-b pb-3" key={term}>
            <dt className="text-[10px] tracking-[0.1em] text-muted-foreground uppercase">{term}</dt>
            <dd className="mt-1 font-medium">{description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RecommendationPreview() {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="grid grid-cols-[1fr_auto] gap-4 border-b px-4 py-3 text-[10px] tracking-[0.1em] text-muted-foreground uppercase sm:px-5">
        <span>추천에서 확인하는 것</span>
        <span>근거</span>
      </div>
      {[
        ["음역 비교", "내 실용 음역과 곡 구간"],
        ["추천 키", "부담을 줄이는 이동 키"],
        ["추천 이유", "보컬 특성에 맞는 근거"],
      ].map(([label, description]) => (
        <div
          className="grid grid-cols-[minmax(5rem,.55fr)_minmax(0,1fr)] gap-4 border-b px-4 py-4 last:border-b-0 sm:px-5"
          key={label}
        >
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      ))}
    </div>
  );
}

function MixingPreview() {
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,.7fr)]">
      <div className="rounded-lg border bg-background p-5 sm:p-6">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Selected song</p>
        <h4 className="mt-3 text-lg font-semibold tracking-[-0.025em]">선택한 추천곡만 AI 믹싱</h4>
        <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
          목록을 보는 것만으로 작업이 시작되지 않습니다. 사용자가 선택하고 확인한 곡만 처리합니다.
        </p>
        <div aria-hidden="true" className="mt-6 flex h-10 items-center gap-1">
          {[34, 58, 42, 76, 48, 66, 38, 82, 54, 72, 44, 62, 36, 52].map((height, index) => (
            <span
              className="w-1 rounded-full bg-foreground/70 odd:bg-foreground/25"
              key={`${height}-${index}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
      <ol aria-label="AI 믹싱 이용 흐름" className="grid content-center gap-0">
        {["추천곡 선택", "AI 믹싱 요청", "결과 듣기와 보관"].map((label, index) => (
          <li className="relative flex min-h-16 items-center gap-3 border-l pl-5 text-xs font-medium" key={label}>
            <span className="absolute -left-2 flex size-4 items-center justify-center rounded-full border bg-background text-[8px] text-muted-foreground">
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function LandingProductStory() {
  const previews = [
    <VoiceAnalysisPreview key="analysis" />,
    <RecommendationPreview key="recommendation" />,
    <MixingPreview key="mixing" />,
  ];

  return (
    <section className="border-y" id="how-it-works">
      <div className="mx-auto grid w-full max-w-[72rem] gap-10 px-5 py-16 sm:px-7 lg:grid-cols-[minmax(16rem,.62fr)_minmax(0,1.38fr)] lg:gap-16 lg:px-8 lg:py-24">
        <header className={styles.storyAside}>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            From voice to music
          </p>
          <h2 className="mt-3 max-w-[26rem] text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            목소리가 노래가 되는 과정을 한눈에
          </h2>
          <p className="mt-5 max-w-[25rem] text-[13px] leading-6 text-muted-foreground">
            하나의 목소리 샘플이 설명 가능한 분석과 추천을 거쳐, 사용자가 선택한 AI 믹싱으로 이어집니다.
          </p>
          <ol className="mt-8 hidden border-t lg:block">
            {storySteps.map(({ title }, index) => (
              <li className="flex items-center justify-between border-b py-3 text-xs" key={title}>
                <span>{title}</span>
                <span className="tabular-nums text-muted-foreground">0{index + 1}</span>
              </li>
            ))}
          </ol>
        </header>

        <ol className="grid gap-5 lg:gap-8">
          {storySteps.map(({ description, icon: Icon, title }, index) => (
            <li className={styles.storyPanel} key={title}>
              <article className="rounded-xl border bg-muted/20 p-5 sm:p-7 lg:min-h-[27rem] lg:p-8">
                <header className="mb-7 flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Step 0{index + 1}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">{title}</h3>
                    <p className="mt-2 max-w-[35rem] text-xs leading-5 text-muted-foreground sm:text-[13px] sm:leading-6">
                      {description}
                    </p>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-data-accent/10 text-data-accent-foreground">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </header>
                {previews[index]}
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export { LandingProductStory };
