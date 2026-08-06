"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AudioWaveform,
  BadgeCheck,
  ChevronDown,
  Clock3,
  Code2,
  Gauge,
  Info,
  ShieldCheck,
  Target,
  Volume2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { VocalProfileResponse } from "@/lib/vocal-profile/contract";
import { midiToNoteName } from "@/lib/vocal-profile/pitch";
import {
  axisTicks,
  midiAxis,
  midiPosition,
  parseVocalProfileVisualization,
  type VocalProfileVisualization,
} from "@/lib/vocal-profile/visualization";

const CHART_GREEN = "#079455";

function RangeProfile({ profile }: { profile: VocalProfileResponse }) {
  const axis = midiAxis(profile.minMidi, profile.maxMidi);
  const ticks = axisTicks(axis.low, axis.high);
  const rangeStart = midiPosition(profile.minMidi, axis.low, axis.high);
  const rangeEnd = midiPosition(profile.maxMidi, axis.low, axis.high);
  const tessituraStart = midiPosition(profile.tessituraLowMidi, axis.low, axis.high);
  const tessituraEnd = midiPosition(profile.tessituraHighMidi, axis.low, axis.high);
  const median = midiPosition(profile.medianMidi, axis.low, axis.high);

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">음역 프로필</CardTitle>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><i className="h-2 w-7 rounded-full bg-emerald-200" />전체 관측 음역</span>
          <span className="flex items-center gap-2"><i className="h-2 w-7 rounded-full bg-emerald-600" />실용 음역</span>
          <span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-zinc-600" />중앙음</span>
        </div>
      </CardHeader>
      <CardContent>
        <div aria-label={`전체 관측 음역 ${midiToNoteName(profile.minMidi)}부터 ${midiToNoteName(profile.maxMidi)}, 실용 음역 ${midiToNoteName(profile.tessituraLowMidi)}부터 ${midiToNoteName(profile.tessituraHighMidi)}, 중앙음 ${midiToNoteName(profile.medianMidi)}`} className="relative h-40" role="img">
          {ticks.map((tick) => (
            <div className="absolute top-0 -translate-x-1/2 text-center" key={tick} style={{ left: `${midiPosition(tick, axis.low, axis.high)}%` }}>
              <span className="text-xs font-medium">{midiToNoteName(tick)}</span>
              <span className="mx-auto mt-2 block h-3 w-px bg-border" />
            </div>
          ))}
          <div className="absolute left-0 right-0 top-14 h-px bg-border" />
          <div className="absolute top-[52px] h-3 rounded-full bg-emerald-200" style={{ left: `${rangeStart}%`, width: `${Math.max(1, rangeEnd - rangeStart)}%` }} />
          <div className="absolute top-[84px] h-4 rounded-full bg-emerald-600" style={{ left: `${tessituraStart}%`, width: `${Math.max(1, tessituraEnd - tessituraStart)}%` }} />
          <div className="absolute top-[44px] h-16 border-l border-dashed border-emerald-500" style={{ left: `${median}%` }}><span className="absolute -left-1.5 -top-1 size-3 rounded-full bg-emerald-600" /></div>
          <span className="absolute top-[116px] -translate-x-1/2 font-mono text-[10px] text-muted-foreground" style={{ left: `${rangeStart}%` }}>{profile.minMidi.toFixed(1)}</span>
          <span className="absolute top-[116px] -translate-x-1/2 font-mono text-[10px] text-muted-foreground" style={{ left: `${median}%` }}>{profile.medianMidi.toFixed(1)}</span>
          <span className="absolute top-[116px] -translate-x-1/2 font-mono text-[10px] text-muted-foreground" style={{ left: `${rangeEnd}%` }}>{profile.maxMidi.toFixed(1)}</span>
        </div>
        <div className="grid overflow-hidden rounded-xl border sm:grid-cols-3">
          {[
            ["전체 관측 음역", `${midiToNoteName(profile.minMidi)} ~ ${midiToNoteName(profile.maxMidi)}`, `${profile.minMidi.toFixed(1)} – ${profile.maxMidi.toFixed(1)} MIDI`],
            ["실용 음역", `${midiToNoteName(profile.tessituraLowMidi)} ~ ${midiToNoteName(profile.tessituraHighMidi)}`, `${profile.tessituraLowMidi.toFixed(1)} – ${profile.tessituraHighMidi.toFixed(1)} MIDI`],
            ["중앙음", midiToNoteName(profile.medianMidi), `${profile.medianMidi.toFixed(1)} MIDI`],
          ].map(([label, value, detail]) => (
            <div className="border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0" key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HistogramChart({ profile, visualization }: { profile: VocalProfileResponse; visualization: VocalProfileVisualization | null }) {
  if (!visualization) return <VisualizationUnavailable title="음정 분포" />;
  const bins = visualization.histogram;
  const maximum = Math.max(...bins.map((bin) => bin.ratio), 0.01);
  const width = 720;
  const height = 250;
  const left = 42;
  const right = 16;
  const top = 22;
  const bottom = 42;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const gap = 7;
  const barWidth = Math.max(4, innerWidth / bins.length - gap);
  const medianIndex = bins.reduce((best, bin, index) => Math.abs(bin.midi - profile.medianMidi) < Math.abs(bins[best]!.midi - profile.medianMidi) ? index : best, 0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-lg">음정 분포</CardTitle><p className="text-xs text-muted-foreground">오래 머문 음일수록 막대가 높습니다.</p></CardHeader>
      <CardContent>
        <svg aria-label="음정별 상대 빈도 막대그래프" className="h-auto w-full overflow-visible" role="img" viewBox={`0 0 ${width} ${height}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = top + innerHeight * (1 - ratio);
            return <g key={ratio}><line stroke="currentColor" className="text-border" strokeDasharray="4 4" x1={left} x2={width - right} y1={y} y2={y} /><text className="fill-muted-foreground text-[10px]" textAnchor="end" x={left - 8} y={y + 3}>{Math.round(maximum * ratio * 100)}</text></g>;
          })}
          {bins.map((bin, index) => {
            const slot = innerWidth / bins.length;
            const x = left + index * slot + (slot - barWidth) / 2;
            const barHeight = (bin.ratio / maximum) * innerHeight;
            return <g key={bin.midi}><rect fill={CHART_GREEN} opacity={index === medianIndex ? 1 : 0.82} rx="4" x={x} y={top + innerHeight - barHeight} width={barWidth} height={barHeight} /><text className="fill-foreground text-[10px]" textAnchor="middle" x={x + barWidth / 2} y={height - 20}>{midiToNoteName(bin.midi)}</text></g>;
          })}
          <line stroke={CHART_GREEN} strokeDasharray="4 4" opacity=".55" x1={left + (medianIndex + 0.5) * (innerWidth / bins.length)} x2={left + (medianIndex + 0.5) * (innerWidth / bins.length)} y1={top - 8} y2={top + innerHeight} />
          <text className="fill-muted-foreground text-[9px]" x="2" y="12">상대 빈도 (%)</text>
        </svg>
      </CardContent>
    </Card>
  );
}

function VisualizationUnavailable({ title }: { title: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent><div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed bg-muted/25 p-6 text-center text-sm leading-6 text-muted-foreground">이 프로필은 상세 시각화 데이터가 없습니다.<br />새로 녹음해 분석하면 그래프를 확인할 수 있어요.</div></CardContent>
    </Card>
  );
}

function PitchTrace({ visualization }: { visualization: VocalProfileVisualization | null }) {
  const [open, setOpen] = useState(true);
  if (!visualization) return null;
  const voiced = visualization.track.filter((point): point is { timeMs: number; midi: number } => point.midi !== null);
  if (voiced.length === 0) return null;
  const axis = midiAxis(Math.min(...voiced.map((point) => point.midi)), Math.max(...voiced.map((point) => point.midi)), 2);
  const maxTime = Math.max(...visualization.track.map((point) => point.timeMs), 1);
  const width = 780;
  const height = 240;
  const left = 44;
  const right = 16;
  const top = 18;
  const bottom = 36;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const paths: string[] = [];
  let current = "";
  visualization.track.forEach((point) => {
    if (point.midi === null) {
      if (current) paths.push(current);
      current = "";
      return;
    }
    const x = left + (point.timeMs / maxTime) * innerWidth;
    const y = top + (1 - (point.midi - axis.low) / (axis.high - axis.low)) * innerHeight;
    current += `${current ? " L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  if (current) paths.push(current);
  const yTicks = axisTicks(axis.low, axis.high, 5);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <Card className="shadow-sm">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-6 text-left">
          <span><span className="block text-lg font-semibold">상세 피치 추적</span><span className="mt-1 block text-xs text-muted-foreground">시각화를 위해 최대 720포인트로 요약된 음높이입니다.</span></span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <svg aria-label="시간에 따른 보컬 피치 추적 그래프" className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
              {yTicks.map((tick) => {
                const y = top + (1 - (tick - axis.low) / (axis.high - axis.low)) * innerHeight;
                return <g key={tick}><line className="text-border" stroke="currentColor" strokeDasharray="4 4" x1={left} x2={width - right} y1={y} y2={y} /><text className="fill-muted-foreground text-[10px]" textAnchor="end" x={left - 8} y={y + 3}>{midiToNoteName(tick)}</text></g>;
              })}
              {paths.map((path, index) => <path d={path} fill="none" key={index} stroke={CHART_GREEN} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />)}
              <line className="text-border" stroke="currentColor" x1={left} x2={width - right} y1={top + innerHeight} y2={top + innerHeight} />
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => <text className="fill-muted-foreground text-[10px]" key={ratio} textAnchor="middle" x={left + innerWidth * ratio} y={height - 12}>{((maxTime * ratio) / 1000).toFixed(1)}s</text>)}
            </svg>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return <Card className="shadow-sm"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{detail}</p></div><span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon className="size-5" /></span></CardContent></Card>;
}

export function VocalProfileResults({ profile }: { profile: VocalProfileResponse }) {
  const visualization = useMemo(() => parseVocalProfileVisualization(profile.descriptors), [profile.descriptors]);
  const quality = [
    ["유성 비율", `${(profile.voicedRatio * 100).toFixed(1)}%`, Activity],
    ["피치 안정성", `${(profile.pitchStability * 100).toFixed(1)}%`, Gauge],
    ["클리핑", profile.clippingRatio < 0.001 ? "없음" : `${(profile.clippingRatio * 100).toFixed(2)}%`, BadgeCheck],
    ["평균 음량", `${profile.rmsDb.toFixed(1)} dB`, Volume2],
    ["녹음 길이", profile.recording.durationMs ? `${(profile.recording.durationMs / 1000).toFixed(1)}초` : "-", Clock3],
    ["샘플레이트", profile.recording.sampleRate ? `${profile.recording.sampleRate.toLocaleString()}Hz` : "-", AudioWaveform],
    ["분석기", profile.analyzer, Code2],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.08fr_.92fr]">
        <RangeProfile profile={profile} />
        <HistogramChart profile={profile} visualization={visualization} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard detail={`${profile.minMidi.toFixed(1)} – ${profile.maxMidi.toFixed(1)} MIDI`} icon={AudioWaveform} label="이번 소절 음역" value={`${midiToNoteName(profile.minMidi)} – ${midiToNoteName(profile.maxMidi)}`} />
        <MetricCard detail={`${profile.tessituraLowMidi.toFixed(1)} – ${profile.tessituraHighMidi.toFixed(1)} MIDI`} icon={Target} label="관찰된 중심 구간" value={`${midiToNoteName(profile.tessituraLowMidi)} – ${midiToNoteName(profile.tessituraHighMidi)}`} />
        <MetricCard detail={`${profile.medianMidi.toFixed(1)} MIDI`} icon={Gauge} label="중심 음" value={midiToNoteName(profile.medianMidi)} />
        <MetricCard detail={`유성 구간 ${Math.round(profile.voicedRatio * 100)}%`} icon={ShieldCheck} label="음정 안정도" value={`${Math.round(profile.pitchStability * 100)}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.9fr]">
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-lg">분석 품질</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {quality.map(([label, value, Icon]) => <div className="rounded-xl border bg-muted/20 p-3" key={label}><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p><Icon className="mt-3 size-4 text-emerald-600" /><p className="mt-1 font-mono text-[9px] text-muted-foreground">{label === "분석기" ? profile.analyzerVersion : ""}</p></div>)}
            </div>
            <p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />짧은 한 소절에서 관찰된 결과입니다. 2~3곡을 추가로 분석하면 더 정확해집니다.</p>
          </CardContent>
        </Card>
        <PitchTrace visualization={visualization} />
      </div>
    </div>
  );
}
