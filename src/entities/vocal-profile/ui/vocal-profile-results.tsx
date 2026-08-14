"use client";

import { Activity, AudioWaveform, BadgeCheck, Clock3, Gauge, Info, Volume2 } from "lucide-react";
import { useId, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { StatusNotice } from "@/shared/ui/status-notice";
import { VOCAL_CHART_COLOR, VOCAL_CHART_GRADIENT } from "../lib/chart-brand";
import type { VocalProfileResponse } from "../model/contract";
import { midiToNoteName } from "../model/pitch";
import { referenceBandAvailability, referenceBandSegments } from "../model/reference-segments";
import {
  axisTicks,
  histogramChartData,
  midiAxis,
  parseVocalProfileVisualization,
  pitchChartData,
  type VocalProfileVisualization,
  type VocalRangeMetrics,
} from "../model/visualization";
import { ReferenceBandPlayers } from "./reference-band-players";
import { VocalRangeChart } from "./vocal-range-chart";

const HISTOGRAM_CHART_CONFIG = {
  ratioPercent: { label: "상대 빈도", color: "var(--data-accent)" },
} satisfies ChartConfig;

const PITCH_CHART_CONFIG = {
  midi: { label: "음높이", color: "var(--data-accent)" },
} satisfies ChartConfig;

export function VocalRangeProfile({
  profile,
  title = "음역 프로필",
}: {
  profile: VocalRangeMetrics & { medianMidi?: number | null };
  title?: string;
}) {
  const medianMidi =
    typeof profile.medianMidi === "number" && Number.isFinite(profile.medianMidi) ? profile.medianMidi : null;
  const summary: Array<[string, string, string]> = [
    [
      "전체 관측 음역",
      `${midiToNoteName(profile.minMidi)} ~ ${midiToNoteName(profile.maxMidi)}`,
      `${profile.minMidi.toFixed(1)} – ${profile.maxMidi.toFixed(1)} MIDI`,
    ],
    [
      "실용 음역",
      `${midiToNoteName(profile.tessituraLowMidi)} ~ ${midiToNoteName(profile.tessituraHighMidi)}`,
      `${profile.tessituraLowMidi.toFixed(1)} – ${profile.tessituraHighMidi.toFixed(1)} MIDI`,
    ],
  ];
  if (medianMidi !== null) summary.push(["중앙음", midiToNoteName(medianMidi), `${medianMidi.toFixed(1)} MIDI`]);

  return (
    <Card
      className="overflow-hidden rounded-none border-0 bg-transparent shadow-none"
      data-vocal-profile-section="range"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground" data-vocal-range-legend>
          <span className="flex items-center gap-2" data-range-legend="observed">
            <i
              className="h-2 w-7 rounded-full"
              data-range-legend-swatch="observed"
              style={{ backgroundColor: VOCAL_CHART_COLOR.context }}
            />
            전체 관측 음역
          </span>
          <span className="flex items-center gap-2" data-range-legend="practical">
            <i
              className="h-2 w-7 rounded-full"
              data-range-legend-swatch="practical"
              style={{ backgroundImage: VOCAL_CHART_GRADIENT }}
            />
            실용 음역
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <VocalRangeChart profile={profile} />
        <div
          className={`grid gap-1 rounded-2xl bg-muted/55 p-1 ${medianMidi === null ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
          data-vocal-profile-stat-surface="range"
        >
          {summary.map(([label, value, detail]) => (
            <div className="rounded-xl bg-background px-3 py-3 sm:px-4" key={label}>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HistogramChart({
  profile,
  visualization,
}: {
  profile: VocalProfileResponse;
  visualization: VocalProfileVisualization | null;
}) {
  const histogramGradientId = `${useId().replaceAll(":", "")}-pitch-histogram`;
  if (!visualization) return <VisualizationUnavailable title="음정 분포" />;
  const bins = histogramChartData(visualization);
  const firstBin = bins[0];
  if (!firstBin) return <VisualizationUnavailable title="음정 분포" />;
  const medianBin = bins.reduce(
    (best, bin) => (Math.abs(bin.midi - profile.medianMidi) < Math.abs(best.midi - profile.medianMidi) ? bin : best),
    firstBin,
  );

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none" data-vocal-profile-section="histogram">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">음정 분포</CardTitle>
        <p className="text-[10px] text-muted-foreground">오래 낸 음일수록 막대가 높아요.</p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          aria-label="음정별 상대 빈도 막대그래프"
          className="h-[210px] w-full aspect-auto"
          config={HISTOGRAM_CHART_CONFIG}
          role="img"
        >
          <BarChart accessibilityLayer data={bins} margin={{ left: 0, right: 8, top: 12, bottom: 4 }}>
            <defs>
              <linearGradient
                data-brand-signal-gradient="pitch-histogram"
                id={histogramGradientId}
                x1="0%"
                x2="0%"
                y1="100%"
                y2="0%"
              >
                <stop offset="0%" style={{ stopColor: VOCAL_CHART_COLOR.violet }} />
                <stop offset="55%" style={{ stopColor: VOCAL_CHART_COLOR.blue }} />
                <stop offset="100%" style={{ stopColor: VOCAL_CHART_COLOR.pink }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis dataKey="note" tickLine={false} />
            <YAxis
              axisLine={false}
              tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
              tickLine={false}
              width={38}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _, item) => (
                    <div className="flex min-w-32 justify-between gap-4">
                      <span>
                        {item.payload.note} · {item.payload.midi.toFixed(1)} MIDI
                      </span>
                      <span className="font-mono font-medium">{Number(value).toFixed(1)}%</span>
                    </div>
                  )}
                  hideLabel
                />
              }
            />
            <ReferenceLine stroke="var(--muted-foreground)" strokeDasharray="4 4" x={medianBin.note} />
            <Bar dataKey="ratioPercent" fill={`url(#${histogramGradientId})`} radius={[5, 5, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function VisualizationUnavailable({ title }: { title: string }) {
  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none" data-vocal-profile-section="unavailable">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusNotice
          className="min-h-40"
          description="새로 녹음해 분석하면 그래프를 확인할 수 있어요."
          title="이 프로필에는 상세 차트가 없어요."
        />
      </CardContent>
    </Card>
  );
}

function PitchTrace({ visualization }: { visualization: VocalProfileVisualization | null }) {
  const traceGradientId = `${useId().replaceAll(":", "")}-pitch-trace`;
  if (!visualization) return null;
  const voiced = visualization.track.filter((point): point is { timeMs: number; midi: number } => point.midi !== null);
  if (voiced.length === 0) return null;
  const axis = midiAxis(
    Math.min(...voiced.map((point) => point.midi)),
    Math.max(...voiced.map((point) => point.midi)),
    2,
  );
  const data = pitchChartData(visualization);

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none" data-vocal-profile-section="pitch-trace">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">상세 피치 추적</CardTitle>
        <p className="text-[10px] text-muted-foreground">시간에 따라 관찰된 음높이를 보여줘요.</p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          aria-label="시간에 따른 보컬 피치 추적 그래프"
          className="h-48 w-full aspect-auto"
          config={PITCH_CHART_CONFIG}
          role="img"
        >
          <LineChart accessibilityLayer data={data} margin={{ left: 2, right: 10, top: 10, bottom: 4 }}>
            <defs>
              <linearGradient data-brand-signal-gradient="pitch-trace" id={traceGradientId} x1="0%" x2="100%">
                <stop offset="0%" style={{ stopColor: VOCAL_CHART_COLOR.violet }} />
                <stop offset="50%" style={{ stopColor: VOCAL_CHART_COLOR.blue }} />
                <stop offset="100%" style={{ stopColor: VOCAL_CHART_COLOR.pink }} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" />
            <XAxis
              dataKey="timeSeconds"
              tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
              tickLine={false}
              type="number"
            />
            <YAxis
              domain={[axis.low, axis.high]}
              tickFormatter={(value) => midiToNoteName(Number(value))}
              ticks={axisTicks(axis.low, axis.high, 5)}
              width={36}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _, item) => (
                    <div className="grid min-w-36 grid-cols-2 gap-x-4">
                      <span className="text-muted-foreground">시간</span>
                      <span className="text-right font-mono">{Number(item.payload.timeSeconds).toFixed(2)}초</span>
                      <span className="text-muted-foreground">음높이</span>
                      <span className="text-right font-mono">
                        {item.payload.note} · {Number(value).toFixed(1)}
                      </span>
                    </div>
                  )}
                  hideLabel
                  hideIndicator
                />
              }
            />
            <Line
              connectNulls={false}
              dataKey="midi"
              dot={false}
              isAnimationActive={false}
              stroke={`url(#${traceGradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              type="linear"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function VocalProfileResults({
  profile,
  sourceAudioSrc,
}: {
  profile: VocalProfileResponse;
  sourceAudioSrc?: string;
}) {
  const visualization = useMemo(() => parseVocalProfileVisualization(profile.descriptors), [profile.descriptors]);
  const referenceSegments = useMemo(() => referenceBandSegments(profile.descriptors), [profile.descriptors]);
  const referenceAvailability = useMemo(() => referenceBandAvailability(profile.descriptors), [profile.descriptors]);
  const quality = [
    ["유성 비율", `${(profile.voicedRatio * 100).toFixed(1)}%`, Activity],
    ["피치 안정성", `${(profile.pitchStability * 100).toFixed(1)}%`, Gauge],
    ["클리핑", profile.clippingRatio < 0.001 ? "없음" : `${(profile.clippingRatio * 100).toFixed(2)}%`, BadgeCheck],
    ["평균 음량", `${profile.rmsDb.toFixed(1)} dB`, Volume2],
    ["녹음 길이", profile.recording.durationMs ? `${(profile.recording.durationMs / 1000).toFixed(1)}초` : "-", Clock3],
    [
      "샘플레이트",
      profile.recording.sampleRate ? `${profile.recording.sampleRate.toLocaleString()}Hz` : "-",
      AudioWaveform,
    ],
  ] as const;

  return (
    <div className="space-y-8 sm:space-y-10">
      <section
        aria-label="음역과 음정 분포"
        className="rounded-3xl bg-muted/55 p-4 sm:p-6 lg:p-7"
        data-vocal-profile-chapter="range"
      >
        <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr] lg:gap-8">
          <VocalRangeProfile profile={profile} />
          <HistogramChart profile={profile} visualization={visualization} />
        </div>
      </section>
      <section
        aria-label="분석 품질과 피치 추적"
        className="rounded-3xl bg-muted/55 p-4 sm:p-6 lg:p-7"
        data-vocal-profile-chapter="quality"
      >
        <div className="grid gap-6 lg:grid-cols-[1.3fr_.9fr] lg:gap-8">
          <Card className="rounded-none border-0 bg-transparent shadow-none" data-vocal-profile-section="quality">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">분석 품질</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-1 rounded-2xl bg-muted/55 p-1 sm:grid-cols-3 xl:grid-cols-6"
                data-vocal-profile-stat-surface="quality"
              >
                {quality.map(([label, value, Icon]) => (
                  <div className="rounded-xl bg-background px-3 py-3" key={label}>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="mt-1.5 break-words text-sm font-semibold">{value}</p>
                    <Icon className="mt-2 size-3.5 text-data-accent-foreground" />
                  </div>
                ))}
              </div>
              <p className="mt-3 flex gap-2 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                이번 녹음에서 관찰된 결과예요.
              </p>
            </CardContent>
          </Card>
          <PitchTrace visualization={visualization} />
        </div>
      </section>
      {sourceAudioSrc ? (
        <section
          aria-label="분석된 대표 음역 구간"
          className="rounded-3xl bg-muted/55 p-4 sm:p-6 lg:p-7"
          data-vocal-profile-chapter="reference-bands"
        >
          <Card
            className="rounded-none border-0 bg-transparent shadow-none"
            data-vocal-profile-section="reference-bands"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">분석된 대표 음역 구간</CardTitle>
              <p className="text-[10px] leading-4.5 text-muted-foreground">
                이번 녹음에서 확인한 저음·중앙·고음 구간을 들어볼 수 있어요.
              </p>
            </CardHeader>
            <CardContent>
              {referenceAvailability === "ready" ? (
                <ReferenceBandPlayers
                  key={sourceAudioSrc}
                  segments={referenceSegments}
                  sourceAudioSrc={sourceAudioSrc}
                />
              ) : (
                <StatusNotice
                  description={
                    referenceAvailability === "unavailable"
                      ? "반주 없이 여러 음높이가 포함된 소절로 다시 분석해 주세요."
                      : "새 보컬 프로필을 만들어 주세요."
                  }
                  title={
                    referenceAvailability === "unavailable"
                      ? "이 녹음에서는 안정적인 저음·중앙·고음 구간을 충분히 찾지 못했어요."
                      : "이 프로필은 음역 영역 분석을 지원하기 전에 만들어졌어요."
                  }
                />
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
